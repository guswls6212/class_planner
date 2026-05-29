"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useTeacherDisplaySessions } from "../../hooks/useTeacherDisplaySessions";
import { filterValidTeacherSessions } from "../../hooks/teacherSessions";
import { useColorBy } from "../../hooks/useColorBy";
import { useScheduleView } from "../../hooks/useScheduleView";
import { useTimeRange } from "../../hooks/useTimeRange";
import TimeTableGrid from "../../components/organisms/TimeTableGrid";
import ScheduleFloatingToolbar from "../schedule/_components/ScheduleFloatingToolbar";
import { renderSchedulePdf } from "@/lib/pdf/PdfRenderer";
import { getWeekStartDate } from "../../lib/weekStart";

const PDFDownloadButton = dynamic(
  () => import("../../components/molecules/PDFDownloadButton"),
  { ssr: false, loading: () => null }
);

// 강사 본인 시간표는 read-only — 편집/추가/필터 affordance 없이 view 전환만.
const ScheduleDailyView = dynamic(
  () =>
    import("../../components/organisms/ScheduleDailyView").then((m) => ({
      default: m.ScheduleDailyView,
    })),
  { ssr: false, loading: () => null }
);
const ScheduleMonthlyView = dynamic(
  () => import("../../components/organisms/ScheduleMonthlyView"),
  { ssr: false, loading: () => null }
);

function findMyTeacherId(
  teachers: Array<{ id: string; userId?: string | null }>,
  userId: string | null
): string | null {
  if (!userId) return null;
  const teacher = teachers.find((t) => t.userId === userId);
  return teacher?.id ?? null;
}

const WEEK_LABEL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Seoul",
});

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${WEEK_LABEL_FORMATTER.format(start)} — ${WEEK_LABEL_FORMATTER.format(end)}`;
}

// Suspense 경계: TeacherScheduleContent 내부 useTimeRange 의 useSearchParams 가
// Next.js 15 Static Generation 빌드에서 CSR-bailout 경계를 요구 (/schedule 과 동일 패턴).
export default function TeacherSchedulePage() {
  return (
    <Suspense fallback={null}>
      <TeacherScheduleContent />
    </Suspense>
  );
}

function TeacherScheduleContent() {
  const router = useRouter();
  const {
    data: { sessions, enrollments, subjects, students, teachers },
  } = useIntegratedDataLocal();

  const userId = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : localStorage.getItem("supabase_user_id"),
    []
  );
  const myTeacherId = findMyTeacherId(teachers, userId);
  const myTeacher = teachers.find((t) => t.id === myTeacherId) ?? null;

  // 일/주/월 view + 날짜 네비게이션 (schedule 페이지와 동일 hook 재사용).
  const {
    viewMode,
    setViewMode,
    selectedDate,
    selectedWeekday,
    goToNextDay,
    goToPrevDay,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
    setSelectedDate,
    goToNextMonth,
    goToPrevMonth,
    currentMonthLabel,
  } = useScheduleView();

  // 주별 격리 모델 — 선택된 주의 sessions (weekly/daily + PDF dedup 방어선).
  const selectedWeekStart = useMemo(
    () => getWeekStartDate(selectedDate),
    [selectedDate]
  );
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.weekStartDate === selectedWeekStart),
    [sessions, selectedWeekStart]
  );
  const { sessions: displaySessions } = useTeacherDisplaySessions(
    weekSessions,
    enrollments,
    myTeacherId
  );

  // monthly view 는 여러 주를 표시 — flat array (각 주 occurrence 가 실제 수업이라 dedup X).
  const monthSessions = useMemo(
    () => filterValidTeacherSessions(sessions, enrollments, myTeacherId),
    [sessions, enrollments, myTeacherId]
  );

  const { colorBy } = useColorBy();
  const timeRange = useTimeRange({ sessions: weekSessions, userId });

  const [isDownloading, setIsDownloading] = useState(false);

  // 시크릿 모드 첫 로그인 등 cache 비어있는 경우 loading state — teachers fetch 대기
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (teachers.length > 0) {
      setInitialLoad(false);
      return;
    }
    const t = setTimeout(() => setInitialLoad(false), 1500);
    return () => clearTimeout(t);
  }, [teachers.length]);

  // teacher-schedule-admin-access-policy (2026-05-27): myTeacherId null 이면 /schedule redirect.
  // 강사 entry 매핑 안 된 사용자 (owner/admin/일반 member) 차단 — "본인 시간표" 도메인 외.
  useEffect(() => {
    if (initialLoad) return;
    if (teachers.length > 0 && !myTeacherId) {
      router.replace("/schedule");
    }
  }, [initialLoad, teachers.length, myTeacherId, router]);

  if (initialLoad && teachers.length === 0) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center">
        <p className="text-sm text-[--color-text-secondary]">
          데이터 불러오는 중...
        </p>
      </div>
    );
  }

  // teachers fetched + myTeacherId null → redirect 진행 중. render 차단 (flash 회피).
  if (teachers.length > 0 && !myTeacherId) return null;

  const dateLabel =
    viewMode === "monthly"
      ? currentMonthLabel
      : viewMode === "daily"
        ? DAY_LABEL_FORMATTER.format(selectedDate)
        : formatWeekRange(selectedWeekStart);

  const onPrev =
    viewMode === "daily"
      ? goToPrevDay
      : viewMode === "weekly"
        ? goToPrevWeek
        : goToPrevMonth;
  const onNext =
    viewMode === "daily"
      ? goToNextDay
      : viewMode === "weekly"
        ? goToNextWeek
        : goToNextMonth;
  const prevAriaLabel =
    viewMode === "daily" ? "이전 날" : viewMode === "weekly" ? "이전 주" : "이전 달";
  const nextAriaLabel =
    viewMode === "daily" ? "다음 날" : viewMode === "weekly" ? "다음 주" : "다음 달";

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden p-4">
      <div className="shrink-0 mb-4 flex items-center justify-between border-b border-[--color-border] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold text-[--color-text-primary]">
              내 시간표
            </h2>
            <span className="text-xs text-[--color-text-muted]">{dateLabel}</span>
          </div>
          {myTeacher ? (
            <p className="mt-1 text-sm text-[--color-text-secondary]">
              {myTeacher.name} 강사의 시간표입니다.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[--color-text-secondary]">
              연결된 강사 정보가 없습니다. 설정에서 계정을 강사와 연결해 주세요.
            </p>
          )}
        </div>
        <div data-tour="export" className="inline-block">
          <PDFDownloadButton
            onDownload={async () => {
              setIsDownloading(true);
              try {
                await renderSchedulePdf(
                  Array.from(displaySessions.values()).flat(),
                  subjects,
                  students,
                  enrollments,
                  teachers,
                  {
                    academyName: "CLASS PLANNER",
                  }
                );
              } finally {
                setIsDownloading(false);
              }
            }}
            isDownloading={isDownloading}
          />
        </div>
      </div>

      {/* data-surface wrapper 제거 — body dark theme 상속 (image #11 fix). PDF 출력은 renderSchedulePdf 자체 light styling.
          뷰 영역만 자체 스크롤 (flex-1 min-h-0) — grid 의 sticky 스크롤바가 fixed floating toolbar 를 가리지 않도록 /schedule P3 레이아웃 mirror. */}
      {viewMode === "daily" ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <ScheduleDailyView
            sessions={displaySessions}
            subjects={subjects}
            students={students}
            enrollments={enrollments}
            teachers={teachers}
            selectedWeekday={selectedWeekday}
            colorBy={colorBy}
            onSessionClick={() => {}}
            readOnly
            onSwipeLeft={goToNextDay}
            onSwipeRight={goToPrevDay}
          />
        </div>
      ) : viewMode === "monthly" ? (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <ScheduleMonthlyView
            sessions={monthSessions}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            teachers={teachers}
            colorBy={colorBy}
            currentDate={selectedDate}
            onDayClick={(date) => {
              setSelectedDate(date);
              setViewMode("daily");
            }}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <TimeTableGrid
            sessions={displaySessions}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            teachers={teachers}
            colorBy={colorBy}
            isReadOnly={true}
            onSessionClick={() => {}}
            onDrop={() => {}}
            onEmptySpaceClick={() => {}}
            startHour={timeRange.startHour}
            endHour={timeRange.endHour}
            fillHeight
          />
        </div>
      )}

      <ScheduleFloatingToolbar
        dateLabel={dateLabel}
        onPrev={onPrev}
        onNext={onNext}
        onToday={goToToday}
        prevAriaLabel={prevAriaLabel}
        nextAriaLabel={nextAriaLabel}
        showFilters={false}
        timeRange={timeRange}
        userId={userId}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />
    </div>
  );
}
