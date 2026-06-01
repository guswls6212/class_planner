"use client";

/**
 * /schedule-v2 — 공부방형 시간표(실데이터 연결, 읽기 전용).
 *
 * 현재 academy 의 실제 세션을 per-enrollment 블록으로 그리드(page1)/학생별 표(page2) 렌더.
 * 색=강사. 각 학생을 1인 세션으로 두면 학생별 개별 시간(staggered)이 그대로 표현됨.
 * 기존 /schedule(편집)은 그대로 — 이 route 는 새 보기 디자인(읽기). nav 미연결.
 *
 * 한계: 한 그룹 세션의 학생들은 시간 공유(현 스키마). "같은 수업·학생별 다른 시간"은
 * 세션→per-enrollment 타이밍 모델 변경(ADR) 필요. proposal: study-room-fit-validation
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/atoms/AuthGuard";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import StudyRoomGrid from "./_components/StudyRoomGrid";
import StudyRoomTable from "./_components/StudyRoomTable";
import { buildScheduleVM, localWeekMonday, pickWeek } from "./_data/scheduleViewModel";
import { planSessionAdd } from "../schedule/_utils/sessionAddHelpers";
import { syncEnrollmentCreate, syncSessionCreate } from "../../lib/apiSync";
import { getWeekStartDate } from "../../lib/weekStart";
import AddSessionModal, { type AddSessionInput } from "./_components/AddSessionModal";

type View = "grid" | "table";

function ScheduleV2Content() {
  const { data, loading, updateData } = useIntegratedDataLocal();
  const [view, setView] = useState<View>("grid");
  const [addOpen, setAddOpen] = useState(false);

  const vm = useMemo(() => {
    const week = pickWeek(data.sessions, localWeekMonday(new Date()));
    const weekSessions = week ? data.sessions.filter((s) => s.weekStartDate === week) : [];
    return buildScheduleVM(data, weekSessions);
  }, [data]);

  const legend = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of vm.blocks) {
      if (!map.has(b.color)) map.set(b.color, b.teacherName ?? b.subjectName);
    }
    return Array.from(map, ([color, label]) => ({ color, label }));
  }, [vm.blocks]);

  const addSession = useCallback(
    async (input: AddSessionInput) => {
      const fallback = getWeekStartDate(new Date());
      const plan = planSessionAdd({
        input: {
          subjectId: input.subjectId,
          studentIds: [input.studentId],
          teacherId: input.teacherId ?? undefined,
          weekday: input.weekday,
          startTime: input.startTime,
          endTime: input.endTime,
          weekStartDate: vm.weekStartDate ?? fallback,
        },
        sessions: data.sessions,
        enrollments: data.enrollments,
        fallbackWeekStartDate: fallback,
      });
      await updateData({ sessions: plan.mergedSessions, enrollments: plan.mergedEnrollments });
      const uid = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      for (const enr of plan.newEnrollments) void syncEnrollmentCreate(uid, enr);
      void syncSessionCreate(uid, plan.newSession);
      setAddOpen(false);
    },
    [data.sessions, data.enrollments, updateData, vm.weekStartDate]
  );

  const isEmpty = !loading && vm.blocks.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
          시간표 재설계 미리보기
        </span>
        {vm.weekStartDate && (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]">
            {vm.weekStartDate} 주
          </span>
        )}
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">시간표 — 한눈에 전주</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        색 = 강사, 한 칸 = 학생 1명의 개별 시간. 같은 데이터를 두 가지로 봅니다 —
        <b className="text-[var(--color-text-primary)]"> 그리드</b>(누가 언제 방에) /{" "}
        <b className="text-[var(--color-text-primary)]">학생별 표</b>(이 아이 주간).
      </p>

      {/* 뷰 토글 + 수업 추가 */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5 text-sm">
          {([
            ["grid", "그리드"],
            ["table", "학생별 표"],
          ] as [View, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`rounded-md px-3 py-1 font-medium transition ${
                view === key
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg border border-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-black"
        >
          ＋ 수업 추가
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">불러오는 중…</p>
        ) : isEmpty ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-16 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">이번 주 등록된 수업이 없어요.</p>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <Link href="/schedule" className="text-[var(--color-accent)] hover:underline">
                시간표에서 수업 추가 →
              </Link>
              <Link href="/students" className="text-[var(--color-text-muted)] hover:underline">
                학생 관리
              </Link>
            </div>
          </div>
        ) : view === "grid" ? (
          <StudyRoomGrid blocks={vm.blocks} />
        ) : (
          <StudyRoomTable students={vm.students} />
        )}
      </div>

      {/* 범례 (강사 색) */}
      {!loading && !isEmpty && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-muted)]">색 = 강사:</span>
          {legend.map(({ color, label }) => (
            <span key={color} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      <AddSessionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        students={data.students}
        subjects={data.subjects}
        teachers={data.teachers}
        onSubmit={(input) => void addSession(input)}
      />
    </div>
  );
}

export default function ScheduleV2Page() {
  return (
    <AuthGuard requireAuth={false}>
      <ScheduleV2Content />
    </AuthGuard>
  );
}
