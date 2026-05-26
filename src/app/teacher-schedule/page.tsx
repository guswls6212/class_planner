"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useTeacherDisplaySessions } from "../../hooks/useTeacherDisplaySessions";
import { useColorBy } from "../../hooks/useColorBy";
import TimeTableGrid from "../../components/organisms/TimeTableGrid";
import { renderSchedulePdf } from "@/lib/pdf/PdfRenderer";
import { getWeekStartDate } from "../../lib/weekStart";

const PDFDownloadButton = dynamic(
  () => import("../../components/molecules/PDFDownloadButton"),
  { ssr: false, loading: () => null }
);

function findMyTeacherId(teachers: Array<{ id: string; userId?: string | null }>): string | null {
  if (typeof window === "undefined") return null;
  const userId = localStorage.getItem("supabase_user_id");
  if (!userId) return null;
  const teacher = teachers.find((t) => t.userId === userId);
  return teacher?.id ?? null;
}

const WEEK_LABEL_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${WEEK_LABEL_FORMATTER.format(start)} — ${WEEK_LABEL_FORMATTER.format(end)}`;
}

export default function TeacherSchedulePage() {
  const {
    data: { sessions, enrollments, subjects, students, teachers },
  } = useIntegratedDataLocal();

  const myTeacherId = findMyTeacherId(teachers);
  const myTeacher = teachers.find((t) => t.id === myTeacherId) ?? null;

  // 주별 격리 모델 — 현재 주의 sessions 만 표시
  const currentWeekStart = useMemo(() => getWeekStartDate(new Date()), []);
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.weekStartDate === currentWeekStart),
    [sessions, currentWeekStart],
  );

  const { sessions: displaySessions } = useTeacherDisplaySessions(
    weekSessions,
    enrollments,
    myTeacherId
  );

  const { colorBy } = useColorBy();

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

  if (initialLoad && teachers.length === 0) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center">
        <p className="text-sm text-[--color-text-secondary]">
          데이터 불러오는 중...
        </p>
      </div>
    );
  }

  const weekLabel = formatWeekRange(currentWeekStart);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between border-b border-[--color-border] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold text-[--color-text-primary]">
              내 시간표
            </h2>
            <span className="text-xs text-[--color-text-muted]">{weekLabel}</span>
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
            onDownload={() =>
              renderSchedulePdf(
                Array.from(displaySessions.values()).flat(),
                subjects,
                students,
                enrollments,
                teachers,
                {
                  academyName: "CLASS PLANNER",
                }
              )
            }
            isDownloading={isDownloading}
          />
        </div>
      </div>

      {/* data-surface wrapper 제거 — body dark theme 상속 (image #11 fix). PDF 출력은 renderSchedulePdf 자체 light styling. */}
      <div>
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
        />
      </div>
    </div>
  );
}
