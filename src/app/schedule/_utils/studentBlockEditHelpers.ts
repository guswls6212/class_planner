/**
 * studentBlockEditHelpers — schedule-v2(공부방) 학생별 블록 편집/삭제 plan (split-on-edit).
 *
 * 한 문장 책임: 그리드 블록(= sessionId:enrollmentId)을 편집/삭제할 때, 세션이 2명+를
 * 공유하면 그 enrollment 를 1인 세션으로 "분리"하고, 1명이면 제자리 처리하는 순수 plan 계산.
 *
 * 배경: 세션 단위 편집(planSessionUpdate)은 같은 세션의 전 학생을 함께 이동/삭제시켜
 * 공부방(학생별 staggered 시간)에 맞지 않음. 블록은 enrollment 마다 그려지므로
 * (scheduleViewModel.buildScheduleVM) 편집/삭제도 enrollment 단위여야 함.
 * proposal: per-student-block-split (A 채택, 2026-06-01). DB 스키마 변경 없음 —
 * 시간 그릇(session)만 분리하고 enrollment(학생↔과목)는 불변.
 *
 * side-effect/async 없음 — updateData / sync* / deleteSession 은 page 가 호출.
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { planSessionUpdate } from "./updateSessionHelpers";

export interface StudentBlockEditInput {
  startTime?: string;
  endTime?: string;
  weekday?: number;
  teacherId?: string | null;
}

export interface StudentBlockEditPlan {
  /** updateData payload — 분리/수정 반영된 sessions. */
  mergedSessions: Session[];
  /** 1인 세션 경로 — 제자리 수정된 세션(sync update 대상). split 이면 undefined. */
  inPlaceSession?: Session;
  /** split 경로 — enrollment 가 빠진 원본 세션(sync update 대상). */
  updatedOriginal?: Session;
  /** split 경로 — 분리되어 나온 새 1인 세션(sync create 대상). */
  newSession?: Session;
  didSplit: boolean;
}

function subjectIdOfEnrollment(
  enrollmentId: string | undefined,
  enrollments: Enrollment[],
): string | undefined {
  if (!enrollmentId) return undefined;
  return enrollments.find((e) => e.id === enrollmentId)?.subjectId;
}

/**
 * 학생 블록 편집 plan.
 * - 세션 enrollment 1명(또는 enrollment 미포함) → planSessionUpdate 위임(제자리).
 * - 2명+ → 해당 enrollment 를 새 1인 세션(새 시간/강사)으로 분리 + 원본에서 제거.
 */
export function planStudentBlockEdit(params: {
  sessionId: string;
  enrollmentId: string;
  input: StudentBlockEditInput;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
  genId: () => string;
}): StudentBlockEditPlan {
  const { sessionId, enrollmentId, input, sessions, enrollments, subjects, genId } =
    params;
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return { mergedSessions: sessions, didSplit: false };

  const enrollmentIds = session.enrollmentIds ?? [];

  // 1인 세션(또는 enrollment 미포함) — 제자리 수정.
  if (enrollmentIds.length <= 1 || !enrollmentIds.includes(enrollmentId)) {
    const plan = planSessionUpdate({
      sessionId,
      input: {
        startTime: input.startTime,
        endTime: input.endTime,
        weekday: input.weekday,
        teacherId: input.teacherId,
      },
      sessions,
      enrollments,
      subjects,
    });
    return {
      mergedSessions: plan.mergedSessions,
      inPlaceSession: plan.changedSession,
      didSplit: false,
    };
  }

  // split — enrollment 를 1인 세션으로 분리.
  const remaining = enrollmentIds.filter((id) => id !== enrollmentId);
  const updatedOriginal: Session = {
    ...session,
    enrollmentIds: remaining,
    subjectId: subjectIdOfEnrollment(remaining[0], enrollments) ?? session.subjectId,
  };
  const newSession: Session = {
    id: genId(),
    subjectId: subjectIdOfEnrollment(enrollmentId, enrollments) ?? session.subjectId,
    weekday: input.weekday ?? session.weekday,
    startsAt: input.startTime || session.startsAt,
    endsAt: input.endTime || session.endsAt,
    weekStartDate: session.weekStartDate,
    room: session.room ?? "",
    enrollmentIds: [enrollmentId],
    yPosition: session.yPosition ?? 1,
    teacherId:
      input.teacherId !== undefined ? input.teacherId : session.teacherId ?? null,
  };
  const mergedSessions = sessions
    .map((s) => (s.id === sessionId ? updatedOriginal : s))
    .concat(newSession);
  return { mergedSessions, updatedOriginal, newSession, didSplit: true };
}

export interface StudentBlockDeletePlan {
  mergedSessions: Session[];
  /** true 면 page 가 deleteSession(sessionId) 호출(1인 세션 — undo 토스트 경로). */
  shouldDeleteSession: boolean;
  /** 다인 세션에서 enrollment 만 제거된 원본(sync update 대상). */
  updatedOriginal?: Session;
}

/**
 * 학생 블록 삭제 plan.
 * - 1명(또는 enrollment 미포함) → 세션 통째 삭제 위임(shouldDeleteSession).
 * - 2명+ → 원본 enrollmentIds 에서 그 enrollment 만 제거(세션 유지).
 */
export function planStudentBlockDelete(params: {
  sessionId: string;
  enrollmentId: string;
  sessions: Session[];
  enrollments: Enrollment[];
}): StudentBlockDeletePlan {
  const { sessionId, enrollmentId, sessions, enrollments } = params;
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return { mergedSessions: sessions, shouldDeleteSession: false };

  const enrollmentIds = session.enrollmentIds ?? [];
  if (enrollmentIds.length <= 1 || !enrollmentIds.includes(enrollmentId)) {
    return { mergedSessions: sessions, shouldDeleteSession: true };
  }
  const remaining = enrollmentIds.filter((id) => id !== enrollmentId);
  const updatedOriginal: Session = {
    ...session,
    enrollmentIds: remaining,
    subjectId: subjectIdOfEnrollment(remaining[0], enrollments) ?? session.subjectId,
  };
  const mergedSessions = sessions.map((s) =>
    s.id === sessionId ? updatedOriginal : s,
  );
  return { mergedSessions, shouldDeleteSession: false, updatedOriginal };
}

/**
 * 세션 PUT(/api/sessions/[id]) 이 요구하는 full payload 빌드.
 * route validation: enrollmentIds(non-empty) + subjectId + weekday + start + end 필수
 * (부분 PUT 금지 — feedback_session_partial_put_avoidance). subjectId 는 session 우선,
 * 없으면 enrollment 에서 유도.
 */
export function buildSessionSyncPayload(
  session: Session,
  enrollments: Enrollment[],
): Partial<Omit<Session, "id">> {
  const ids = session.enrollmentIds ?? [];
  return {
    enrollmentIds: ids,
    subjectId: session.subjectId ?? subjectIdOfEnrollment(ids[0], enrollments),
    weekday: session.weekday,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    teacherId: session.teacherId ?? null,
    weekStartDate: session.weekStartDate,
    room: session.room,
  };
}
