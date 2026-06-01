"use client";

/**
 * /schedule-v2 — 공부방형 시간표(실데이터 연결, 추가·수정·삭제).
 *
 * 현재 academy 의 실제 세션을 per-enrollment 블록으로 그리드(page1)/학생별 표(page2) 렌더.
 * 색=과목. 각 학생을 1인 세션으로 두면 학생별 개별 시간(staggered)이 그대로 표현됨.
 *
 * 주 연속성(A2, 2026-06-01): 항상 "이번 주"(getWeekStartDate(now)) 기준. 이번 주가 비어 있고
 *   직전 데이터 주가 있으면 1회 확인 카드 — [지난주 그대로 가져오기](carryForwardSessions clone)
 *   / [빈 주로 시작](emptyWeek 플래그). "비우기"로 현재 주 초기화. proposal: schedule-v2-week-continuity.
 * 운영시간: 설정에서 이전 — 헤더 ⚙ 토글로 OperatingHoursSection. 미설정/auto 면 그리드 자동맞춤,
 *   기본/사용자지정이면 그 시간으로 축 고정.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/atoms/AuthGuard";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import StudyRoomGrid from "./_components/StudyRoomGrid";
import StudyRoomTable from "./_components/StudyRoomTable";
import { buildScheduleVM } from "./_data/scheduleViewModel";
import {
  carryForwardSessions,
  emptyWeekFlagKey,
  previousWeekWithData,
} from "./_data/weekCarry";
import { planSessionAdd } from "../schedule/_utils/sessionAddHelpers";
import { planSessionUpdate } from "../schedule/_utils/updateSessionHelpers";
import { syncEnrollmentCreate, syncSessionCreate, syncSessionUpdate } from "../../lib/apiSync";
import { getWeekStartDate } from "../../lib/weekStart";
import { readStoredRange, type StoredTimeRange } from "../../hooks/useTimeRange";
import { showToast } from "../../lib/toast";
import OperatingHoursSection from "../../components/organisms/OperatingHoursSection";
import SessionFormModal, { type SessionFormInput, type SessionFormInitial } from "./_components/SessionFormModal";
import StudentWeekEntryModal from "./_components/StudentWeekEntryModal";
import SessionPopover from "./_components/SessionPopover";

type View = "grid" | "table";

/** 저장된 운영시간 → 그리드 축. auto/미설정이면 undefined(데이터 자동맞춤 = 기존 동작). */
function gridRangeFromStored(
  stored: StoredTimeRange | null,
): { startHour: number; endHour: number } | undefined {
  if (!stored || stored.mode === "auto") return undefined;
  if (stored.mode === "default") return { startHour: 9, endHour: 23 };
  if (
    stored.mode === "custom" &&
    typeof stored.startHour === "number" &&
    typeof stored.endHour === "number" &&
    stored.startHour < stored.endHour
  ) {
    return { startHour: stored.startHour, endHour: stored.endHour };
  }
  return undefined;
}

function ScheduleV2Content() {
  const { data, loading, updateData, deleteSession, bulkDeleteSessions } =
    useIntegratedDataLocal();
  const [view, setView] = useState<View>("grid");
  const [modal, setModal] = useState<
    { mode: "add" } | { mode: "edit"; sessionId: string; initial: SessionFormInitial } | null
  >(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [popover, setPopover] = useState<
    { sessionId: string; anchor: DOMRect; initial: SessionFormInitial } | null
  >(null);

  // 항상 "이번 주" 기준 (getWeekStartDate = 세션 저장 키와 동일 KST 월요일).
  const currentMonday = useMemo(() => getWeekStartDate(new Date()), []);
  const currentWeekSessions = useMemo(
    () => data.sessions.filter((s) => s.weekStartDate === currentMonday),
    [data.sessions, currentMonday]
  );
  const sourceMonday = useMemo(
    () => previousWeekWithData(data.sessions, currentMonday),
    [data.sessions, currentMonday]
  );
  const vm = useMemo(
    () => buildScheduleVM(data, currentWeekSessions),
    [data, currentWeekSessions]
  );

  // 운영시간(설정에서 이전) — uid + 저장값(grid 축 반영) + 패널 토글.
  const [uid, setUid] = useState<string | null>(null);
  const [storedRange, setStoredRange] = useState<StoredTimeRange | null>(null);
  const [showHours, setShowHours] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setUid(localStorage.getItem("supabase_user_id"));
  }, []);
  useEffect(() => {
    setStoredRange(readStoredRange(uid));
  }, [uid]);
  const gridRange = useMemo(() => gridRangeFromStored(storedRange), [storedRange]);

  // A2 빈 주 — "이 주는 비움" 사용자 의도 플래그(localStorage). carry 프롬프트 재노출 방지.
  const [dismissedEmpty, setDismissedEmpty] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissedEmpty(
        localStorage.getItem(emptyWeekFlagKey(uid, currentMonday)) === "1"
      );
    } catch {
      setDismissedEmpty(false);
    }
  }, [uid, currentMonday]);

  const markEmptyWeek = useCallback(() => {
    try {
      localStorage.setItem(emptyWeekFlagKey(uid, currentMonday), "1");
    } catch {
      /* localStorage 비활성 — 무시 */
    }
    setDismissedEmpty(true);
  }, [uid, currentMonday]);

  const clearEmptyWeek = useCallback(() => {
    try {
      localStorage.removeItem(emptyWeekFlagKey(uid, currentMonday));
    } catch {
      /* 무시 */
    }
    setDismissedEmpty(false);
  }, [uid, currentMonday]);

  const legend = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of vm.blocks) {
      if (!map.has(b.color)) map.set(b.color, b.subjectName);
    }
    return Array.from(map, ([color, label]) => ({ color, label }));
  }, [vm.blocks]);

  const addSession = useCallback(
    async (input: SessionFormInput) => {
      const plan = planSessionAdd({
        input: {
          subjectId: input.subjectId,
          studentIds: [input.studentId],
          teacherId: input.teacherId ?? undefined,
          weekday: input.weekday,
          startTime: input.startTime,
          endTime: input.endTime,
          weekStartDate: currentMonday,
        },
        sessions: data.sessions,
        enrollments: data.enrollments,
        fallbackWeekStartDate: currentMonday,
      });
      await updateData({ sessions: plan.mergedSessions, enrollments: plan.mergedEnrollments });
      const u = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      for (const enr of plan.newEnrollments) void syncEnrollmentCreate(u, enr);
      void syncSessionCreate(u, plan.newSession);
      clearEmptyWeek();
      setModal(null);
    },
    [data.sessions, data.enrollments, updateData, currentMonday, clearEmptyWeek]
  );

  // D — 학생-주 일괄: 채운 셀마다 planSessionAdd 를 fold(이전 merged 위에 누적) → updateData 1회 + sync N.
  const bulkAdd = useCallback(
    async (inputs: SessionFormInput[]) => {
      let sessions = data.sessions;
      let enrollments = data.enrollments;
      const newSessions: typeof data.sessions = [];
      const newEnrollments: typeof data.enrollments = [];
      for (const input of inputs) {
        const plan = planSessionAdd({
          input: {
            subjectId: input.subjectId,
            studentIds: [input.studentId],
            teacherId: input.teacherId ?? undefined,
            weekday: input.weekday,
            startTime: input.startTime,
            endTime: input.endTime,
            weekStartDate: currentMonday,
          },
          sessions,
          enrollments,
          fallbackWeekStartDate: currentMonday,
        });
        sessions = plan.mergedSessions;
        enrollments = plan.mergedEnrollments;
        newSessions.push(plan.newSession);
        newEnrollments.push(...plan.newEnrollments);
      }
      await updateData({ sessions, enrollments });
      const u = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      for (const enr of newEnrollments) void syncEnrollmentCreate(u, enr);
      for (const s of newSessions) void syncSessionCreate(u, s);
      clearEmptyWeek();
      setBulkOpen(false);
    },
    [data.sessions, data.enrollments, updateData, currentMonday, clearEmptyWeek]
  );

  // 지난주 그대로 가져오기 — 직전 주 세션을 이번 주로 clone(새 id, 같은 enrollmentIds 재사용).
  // create 는 bulkAdd 와 동일 fire-and-forget(void syncSessionCreate) 패턴(ADR-012). enrollment 신규 없음.
  const carryForward = useCallback(async () => {
    if (!sourceMonday) return;
    const cloned = carryForwardSessions({
      sessions: data.sessions,
      enrollments: data.enrollments,
      sourceMonday,
      targetMonday: currentMonday,
      genId: () => crypto.randomUUID(),
    });
    if (cloned.length === 0) {
      markEmptyWeek();
      return;
    }
    await updateData({ sessions: [...data.sessions, ...cloned] });
    const u = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
    for (const s of cloned) void syncSessionCreate(u, s);
    clearEmptyWeek();
    showToast("success", `지난주에서 수업 ${cloned.length}개를 가져왔어요`);
  }, [
    sourceMonday,
    data.sessions,
    data.enrollments,
    currentMonday,
    updateData,
    markEmptyWeek,
    clearEmptyWeek,
  ]);

  // 이번 주 비우기 — 현재 주 세션 일괄 삭제(단일 undo 토스트) + 빈 주 의도 표시(carry 재노출 방지).
  const clearWeek = useCallback(async () => {
    const ids = currentWeekSessions.map((s) => s.id);
    if (ids.length === 0) return;
    markEmptyWeek();
    await bulkDeleteSessions(ids);
  }, [currentWeekSessions, bulkDeleteSessions, markEmptyWeek]);

  // 편집: 친구 핵심(시간/요일/강사)만. 학생/과목 변경은 삭제+재추가(enrollment 재조정 회피).
  const editSession = useCallback(
    async (sessionId: string, input: SessionFormInput) => {
      const plan = planSessionUpdate({
        sessionId,
        input: {
          startTime: input.startTime,
          endTime: input.endTime,
          weekday: input.weekday,
          teacherId: input.teacherId,
        },
        sessions: data.sessions,
        enrollments: data.enrollments,
        subjects: data.subjects,
      });
      await updateData({ sessions: plan.mergedSessions });
      const uidForSync = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      if (plan.changedSession) {
        void syncSessionUpdate(uidForSync, sessionId, {
          startsAt: plan.changedSession.startsAt,
          endsAt: plan.changedSession.endsAt,
          weekday: plan.changedSession.weekday,
          teacherId: plan.changedSession.teacherId,
        });
      }
      setModal(null);
    },
    [data.sessions, data.enrollments, data.subjects, updateData]
  );

  // 블록 클릭 → 그 자리에 빠른 편집 팝오버(C). anchor = 블록 DOMRect. (blockId = "sessionId:enrollmentId")
  const openPopover = useCallback(
    (blockId: string, anchor: DOMRect) => {
      const [sid, eid] = blockId.split(":");
      const sess = data.sessions.find((s) => s.id === sid);
      if (!sess) return;
      const enr = data.enrollments.find((e) => e.id === eid);
      const student = enr ? data.students.find((s) => s.id === enr.studentId) : undefined;
      const subject = enr ? data.subjects.find((s) => s.id === enr.subjectId) : undefined;
      setPopover({
        sessionId: sid,
        anchor,
        initial: {
          studentId: enr?.studentId ?? "",
          studentName: student?.name ?? "?",
          subjectId: enr?.subjectId ?? "",
          subjectName: subject?.name ?? "?",
          teacherId: sess.teacherId ?? null,
          weekday: sess.weekday,
          startTime: sess.startsAt,
          endTime: sess.endsAt,
        },
      });
    },
    [data.sessions, data.enrollments, data.students, data.subjects]
  );

  const removeCurrentSession = useCallback(async () => {
    if (modal?.mode !== "edit") return;
    await deleteSession(modal.sessionId);
    setModal(null);
  }, [modal, deleteSession]);

  const isEmpty = !loading && vm.blocks.length === 0;
  const showCarryPrompt =
    !loading && currentWeekSessions.length === 0 && !!sourceMonday && !dismissedEmpty;
  const sourceCount = useMemo(
    () => (sourceMonday ? data.sessions.filter((s) => s.weekStartDate === sourceMonday).length : 0),
    [sourceMonday, data.sessions]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-muted)]">
          {currentMonday} 주
        </span>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">시간표 — 한눈에 전주</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        색 = 과목, 한 칸 = 학생 1명의 개별 시간. 같은 데이터를 두 가지로 봅니다 —
        <b className="text-[var(--color-text-primary)]"> 그리드</b>(누가 언제 방에) /{" "}
        <b className="text-[var(--color-text-primary)]">학생별 표</b>(이 아이 주간).
      </p>

      {/* 뷰 토글 + 수업 추가 + 운영시간 + 비우기 */}
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
          onClick={() => setModal({ mode: "add" })}
          className="rounded-lg border border-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent)] hover:text-black"
        >
          ＋ 수업 추가
        </button>
        <button
          onClick={() => setBulkOpen(true)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
        >
          학생별 일괄 입력
        </button>
        <button
          onClick={() => setShowHours((v) => !v)}
          aria-expanded={showHours}
          data-testid="operating-hours-toggle"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            showHours
              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
              : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          ⚙ 운영시간
        </button>
        {currentWeekSessions.length > 0 && (
          <button
            onClick={() => void clearWeek()}
            data-testid="clear-week-btn"
            className="ml-auto rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-red-400/60 hover:text-red-300"
          >
            이번 주 비우기
          </button>
        )}
      </div>

      {showHours && (
        <div className="mt-2">
          <OperatingHoursSection
            userId={uid}
            onChange={() => setStoredRange(readStoredRange(uid))}
          />
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">불러오는 중…</p>
        ) : showCarryPrompt ? (
          <div
            data-testid="week-carry-prompt"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-12 text-center"
          >
            <p className="text-base font-semibold text-[var(--color-text-primary)]">
              이번 주({currentMonday}) 시간표를 시작할게요
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
              지난주({sourceMonday})와 거의 같나요? 지난주 수업 {sourceCount}개를 그대로 가져와서
              바뀐 것만 고치면 돼요.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <button
                onClick={() => void carryForward()}
                data-testid="carry-forward-btn"
                className="w-56 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-black transition hover:opacity-90"
              >
                지난주 그대로 가져오기
              </button>
              <button
                onClick={markEmptyWeek}
                data-testid="start-empty-week-btn"
                className="w-56 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
              >
                빈 주로 시작
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-16 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">이번 주 등록된 수업이 없어요.</p>
            <div className="mt-3 flex justify-center gap-3 text-sm">
              <button onClick={() => setModal({ mode: "add" })} className="text-[var(--color-accent)] hover:underline">
                ＋ 수업 추가
              </button>
              <Link href="/students" className="text-[var(--color-text-muted)] hover:underline">
                학생 관리
              </Link>
            </div>
          </div>
        ) : view === "grid" ? (
          <StudyRoomGrid blocks={vm.blocks} onBlockClick={openPopover} range={gridRange} />
        ) : (
          <StudyRoomTable students={vm.students} />
        )}
      </div>

      {/* 범례 (과목 색) */}
      {!loading && !isEmpty && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-muted)]">색 = 과목:</span>
          {legend.map(({ color, label }) => (
            <span key={color} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {modal && (
        <SessionFormModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.initial : undefined}
          students={data.students}
          subjects={data.subjects}
          teachers={data.teachers}
          onSubmit={(input) =>
            modal.mode === "edit"
              ? void editSession(modal.sessionId, input)
              : void addSession(input)
          }
          onDelete={modal.mode === "edit" ? () => void removeCurrentSession() : undefined}
          onClose={() => setModal(null)}
        />
      )}
      {bulkOpen && (
        <StudentWeekEntryModal
          students={data.students}
          subjects={data.subjects}
          enrollments={data.enrollments}
          sessions={data.sessions}
          onClose={() => setBulkOpen(false)}
          onBulkCreate={(inputs) => void bulkAdd(inputs)}
        />
      )}
      {popover && (
        <SessionPopover
          initial={popover.initial}
          anchor={popover.anchor}
          teachers={data.teachers}
          onSave={(input) => {
            void editSession(popover.sessionId, input);
            setPopover(null);
          }}
          onDelete={() => {
            void deleteSession(popover.sessionId);
            setPopover(null);
          }}
          onClose={() => setPopover(null)}
        />
      )}
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
