"use client";

/**
 * /schedule-v2 — 공부방형 시간표(실데이터 연결, 추가·수정·삭제).
 *
 * 현재 academy 의 실제 세션을 per-enrollment 블록으로 그리드(page1)/학생별 표(page2) 렌더.
 * 색=과목. 각 학생을 1인 세션으로 두면 학생별 개별 시간(staggered)이 그대로 표현됨.
 *
 * 주 이동(W2, 2026-06-01): ◀ 지난주 · [이번 주·날짜] · 다음 주 ▶ + 현재 주 아니면 "오늘" 버튼.
 *   viewedMonday = todayMonday + weekOffset 주. 모든 데이터/입력/carry 는 viewedMonday 기준.
 * 주 연속성(A2): viewedMonday 가 비어 있고 직전 데이터 주가 있으면 1회 확인 카드 —
 *   [지난주 그대로 가져오기](carryForwardSessions clone) / [빈 주로 시작](emptyWeek 플래그).
 *   "비우기"로 현재 보는 주 초기화. proposal: schedule-v2-week-continuity.
 * 운영시간(O3): 헤더 ⚙ 드롭다운(OperatingHoursMenu). 미설정/auto 면 그리드 자동맞춤,
 *   기본/사용자지정이면 그 시간으로 축 고정. 저장 키는 grid/PDF 공용.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/atoms/AuthGuard";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import StudyRoomGrid from "./_components/StudyRoomGrid";
import StudyRoomTable from "./_components/StudyRoomTable";
import OperatingHoursMenu from "./_components/OperatingHoursMenu";
import { buildScheduleVM } from "./_data/scheduleViewModel";
import {
  addWeeks,
  carryForwardSessions,
  emptyWeekFlagKey,
  previousWeekWithData,
} from "./_data/weekCarry";
import { planSessionAdd } from "../schedule/_utils/sessionAddHelpers";
import {
  planStudentBlockEdit,
  planStudentBlockDelete,
  buildSessionSyncPayload,
} from "../schedule/_utils/studentBlockEditHelpers";
import { syncEnrollmentCreate, syncSessionCreate, syncSessionUpdate } from "../../lib/apiSync";
import { getWeekStartDate } from "../../lib/weekStart";
import { readStoredRange, type StoredTimeRange } from "../../hooks/useTimeRange";
import { showToast } from "../../lib/toast";
import SessionFormModal, { type SessionFormInput, type SessionFormInitial } from "./_components/SessionFormModal";
import StudentWeekEntryModal from "./_components/StudentWeekEntryModal";
import SessionPopover from "./_components/SessionPopover";
import ConfirmModal from "../../components/molecules/ConfirmModal";
import { useMyRole } from "../../hooks/useMyRole";

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

/** weekOffset → 상대 라벨. (0=이번 주, -1=지난주, +1=다음 주, 그 외 N주 전/후) */
function relWeekLabel(offset: number): string {
  if (offset === 0) return "이번 주";
  if (offset === -1) return "지난주";
  if (offset === 1) return "다음 주";
  return offset < 0 ? `${-offset}주 전` : `${offset}주 후`;
}

function ScheduleV2Content() {
  const { data, loading, updateData, deleteSession, bulkDeleteSessions } =
    useIntegratedDataLocal();
  // Role gate — member 는 read-only(보기·출결만). 익명/owner/admin 은 canManage=true.
  // schedule-v2 가 /schedule 의 member read-only role-branch 를 안 물려받아, member 가
  // 추가·삭제·copy-week 시도 → 서버 403(owner/admin 전용) → stranded 동기화 에러 나던 회귀 fix.
  const { canManage } = useMyRole();
  const [view, setView] = useState<View>("grid");
  const [modal, setModal] = useState<
    | { mode: "add" }
    | { mode: "edit"; sessionId: string; enrollmentId: string; initial: SessionFormInitial }
    | null
  >(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [popover, setPopover] = useState<
    { sessionId: string; enrollmentId: string; anchor: DOMRect; initial: SessionFormInitial } | null
  >(null);

  // 주 이동 — todayMonday(고정) + weekOffset → viewedMonday(보는 주).
  const todayMonday = useMemo(() => getWeekStartDate(new Date()), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const viewedMonday = useMemo(() => addWeeks(todayMonday, weekOffset), [todayMonday, weekOffset]);

  const viewedWeekSessions = useMemo(
    () => data.sessions.filter((s) => s.weekStartDate === viewedMonday),
    [data.sessions, viewedMonday]
  );
  const sourceMonday = useMemo(
    () => previousWeekWithData(data.sessions, viewedMonday),
    [data.sessions, viewedMonday]
  );
  const vm = useMemo(
    () => buildScheduleVM(data, viewedWeekSessions),
    [data, viewedWeekSessions]
  );

  // 운영시간(O3 드롭다운) — uid + 저장값(grid 축 반영).
  const [uid, setUid] = useState<string | null>(null);
  const [storedRange, setStoredRange] = useState<StoredTimeRange | null>(null);
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
        localStorage.getItem(emptyWeekFlagKey(uid, viewedMonday)) === "1"
      );
    } catch {
      setDismissedEmpty(false);
    }
  }, [uid, viewedMonday]);

  const markEmptyWeek = useCallback(() => {
    try {
      localStorage.setItem(emptyWeekFlagKey(uid, viewedMonday), "1");
    } catch {
      /* localStorage 비활성 — 무시 */
    }
    setDismissedEmpty(true);
  }, [uid, viewedMonday]);

  const clearEmptyWeek = useCallback(() => {
    try {
      localStorage.removeItem(emptyWeekFlagKey(uid, viewedMonday));
    } catch {
      /* 무시 */
    }
    setDismissedEmpty(false);
  }, [uid, viewedMonday]);

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
          weekStartDate: viewedMonday,
        },
        sessions: data.sessions,
        enrollments: data.enrollments,
        fallbackWeekStartDate: viewedMonday,
      });
      await updateData({ sessions: plan.mergedSessions, enrollments: plan.mergedEnrollments });
      const u = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      for (const enr of plan.newEnrollments) void syncEnrollmentCreate(u, enr);
      void syncSessionCreate(u, plan.newSession);
      clearEmptyWeek();
      setModal(null);
    },
    [data.sessions, data.enrollments, updateData, viewedMonday, clearEmptyWeek]
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
            weekStartDate: viewedMonday,
          },
          sessions,
          enrollments,
          fallbackWeekStartDate: viewedMonday,
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
    [data.sessions, data.enrollments, updateData, viewedMonday, clearEmptyWeek]
  );

  // 지난주 그대로 가져오기 — 직전 주 세션을 보는 주로 clone(새 id, 같은 enrollmentIds 재사용).
  // create 는 bulkAdd 와 동일 fire-and-forget(void syncSessionCreate) 패턴(ADR-012). enrollment 신규 없음.
  const carryForward = useCallback(async () => {
    if (!sourceMonday) return;
    const cloned = carryForwardSessions({
      sessions: data.sessions,
      enrollments: data.enrollments,
      sourceMonday,
      targetMonday: viewedMonday,
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
    viewedMonday,
    updateData,
    markEmptyWeek,
    clearEmptyWeek,
  ]);

  // 이번 주 비우기 — 보는 주 세션 일괄 삭제(단일 undo 토스트) + 빈 주 의도 표시(carry 재노출 방지).
  const clearWeek = useCallback(async () => {
    const ids = viewedWeekSessions.map((s) => s.id);
    if (ids.length === 0) return;
    markEmptyWeek();
    await bulkDeleteSessions(ids);
  }, [viewedWeekSessions, bulkDeleteSessions, markEmptyWeek]);

  // 편집(split-on-edit): 블록은 (sessionId, enrollmentId) 쌍. 세션이 2명+면 그 학생을
  // 1인 세션으로 분리(나머지 유지), 1명이면 제자리. proposal: per-student-block-split.
  const editStudentBlock = useCallback(
    async (sessionId: string, enrollmentId: string, input: SessionFormInput) => {
      const plan = planStudentBlockEdit({
        sessionId,
        enrollmentId,
        input: {
          startTime: input.startTime,
          endTime: input.endTime,
          weekday: input.weekday,
          teacherId: input.teacherId,
        },
        sessions: data.sessions,
        enrollments: data.enrollments,
        subjects: data.subjects,
        genId: () => crypto.randomUUID(),
      });
      await updateData({ sessions: plan.mergedSessions });
      const uidForSync = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
      // PUT 은 full payload 필수(buildSessionSyncPayload). split 이면 원본 갱신 + 신규 create.
      if (plan.didSplit) {
        if (plan.updatedOriginal)
          void syncSessionUpdate(uidForSync, plan.updatedOriginal.id, buildSessionSyncPayload(plan.updatedOriginal, data.enrollments));
        if (plan.newSession) void syncSessionCreate(uidForSync, plan.newSession);
      } else if (plan.inPlaceSession) {
        void syncSessionUpdate(uidForSync, plan.inPlaceSession.id, buildSessionSyncPayload(plan.inPlaceSession, data.enrollments));
      }
      setModal(null);
      setPopover(null);
    },
    [data.sessions, data.enrollments, data.subjects, updateData]
  );

  // 삭제(split-on-delete): 세션이 2명+면 그 enrollment 만 제거(세션 유지), 1명이면 세션 통째 삭제.
  const deleteStudentBlock = useCallback(
    async (sessionId: string, enrollmentId: string) => {
      const plan = planStudentBlockDelete({
        sessionId,
        enrollmentId,
        sessions: data.sessions,
        enrollments: data.enrollments,
      });
      if (plan.shouldDeleteSession) {
        await deleteSession(sessionId);
      } else {
        await updateData({ sessions: plan.mergedSessions });
        const uidForSync = typeof window !== "undefined" ? localStorage.getItem("supabase_user_id") : null;
        if (plan.updatedOriginal)
          void syncSessionUpdate(uidForSync, plan.updatedOriginal.id, buildSessionSyncPayload(plan.updatedOriginal, data.enrollments));
        showToast("success", "이 학생만 시간표에서 뺐어요");
      }
      setModal(null);
      setPopover(null);
    },
    [data.sessions, data.enrollments, updateData, deleteSession]
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
        enrollmentId: eid,
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

  const isEmpty = !loading && vm.blocks.length === 0;
  const showCarryPrompt =
    canManage && !loading && viewedWeekSessions.length === 0 && !!sourceMonday && !dismissedEmpty;
  const sourceCount = useMemo(
    () => (sourceMonday ? data.sessions.filter((s) => s.weekStartDate === sourceMonday).length : 0),
    [sourceMonday, data.sessions]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* 주 이동 (W2 상대 라벨 + 오늘) */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1 text-[12px]">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            data-testid="week-prev"
            className="rounded-lg px-2 py-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            ◀ <span className="text-[11px]">{relWeekLabel(weekOffset - 1)}</span>
          </button>
          <span className="rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-1 font-semibold text-[var(--color-accent)]">
            {relWeekLabel(weekOffset)} · {viewedMonday}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            data-testid="week-next"
            className="rounded-lg px-2 py-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <span className="text-[11px]">{relWeekLabel(weekOffset + 1)}</span> ▶
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            data-testid="week-today"
            className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
          >
            오늘
          </button>
        )}
      </div>

      {/* 제목·설명 줄 제거 (2026-06-01 사용자 픽 — 도움말 아이콘 없이 간결하게). 색=과목은 하단 범례로. */}
      {/* 뷰 토글 + 수업 추가 + 운영시간 + 비우기 */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
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
        {canManage && (
          <>
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
          </>
        )}
        <OperatingHoursMenu userId={uid} onChange={() => setStoredRange(readStoredRange(uid))} />
        {viewedWeekSessions.length > 0 && canManage && (
          <button
            onClick={() => setClearConfirm(true)}
            data-testid="clear-week-btn"
            className="ml-auto rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition hover:border-red-400/60 hover:text-red-300"
          >
            이번 주 비우기
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-muted)]">불러오는 중…</p>
        ) : showCarryPrompt ? (
          <div
            data-testid="week-carry-prompt"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-12 text-center"
          >
            <p className="text-base font-semibold text-[var(--color-text-primary)]">
              {relWeekLabel(weekOffset)}({viewedMonday}) 시간표를 시작할게요
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
            <p className="text-sm text-[var(--color-text-secondary)]">{relWeekLabel(weekOffset)} 등록된 수업이 없어요.</p>
            {canManage && (
              <div className="mt-3 flex justify-center gap-3 text-sm">
                <button onClick={() => setModal({ mode: "add" })} className="text-[var(--color-accent)] hover:underline">
                  ＋ 수업 추가
                </button>
                <Link href="/students" className="text-[var(--color-text-muted)] hover:underline">
                  학생 관리
                </Link>
              </div>
            )}
          </div>
        ) : view === "grid" ? (
          <StudyRoomGrid blocks={vm.blocks} onBlockClick={canManage ? openPopover : undefined} range={gridRange} />
        ) : (
          <StudyRoomTable students={vm.students} />
        )}
      </div>

      {modal && (
        <SessionFormModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.initial : undefined}
          students={data.students}
          subjects={data.subjects}
          teachers={data.teachers}
          onSubmit={(input) =>
            modal.mode === "edit"
              ? void editStudentBlock(modal.sessionId, modal.enrollmentId, input)
              : void addSession(input)
          }
          onDelete={modal.mode === "edit" ? () => void deleteStudentBlock(modal.sessionId, modal.enrollmentId) : undefined}
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
            void editStudentBlock(popover.sessionId, popover.enrollmentId, input);
            setPopover(null);
          }}
          onDelete={() => {
            void deleteStudentBlock(popover.sessionId, popover.enrollmentId);
            setPopover(null);
          }}
          onClose={() => setPopover(null)}
        />
      )}
      <ConfirmModal
        isOpen={clearConfirm}
        title="이번 주 수업을 모두 비울까요?"
        message={`이번 주 수업 ${viewedWeekSessions.length}개가 삭제됩니다. 삭제 후에도 잠깐 되돌릴 수 있어요.`}
        confirmText="비우기"
        cancelText="취소"
        variant="danger"
        onConfirm={() => {
          setClearConfirm(false);
          void clearWeek();
        }}
        onCancel={() => setClearConfirm(false)}
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
