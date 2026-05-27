/**
 * addSession 의 enrollment build + new session 생성 logic 만 pure function 추출.
 *
 * 기존: schedule/page.tsx 의 addSession (127 줄) 가 enrollment 보장 + new session
 * 빌드 + updateData payload 조립 + sync 호출 + setTimeout reposition 모두 inline.
 *
 * 본 utils: **state mutation / async 안 함**. enrollment 보장 + new session +
 * mergedSessions/mergedEnrollments 반환. logger / updateData / sync* / startInteraction
 * 등 side-effect 는 page 가 호출.
 *
 * `setTimeout` reposition step 도 본 utils 가 `buildRepositionedSessions` 로 helper
 * 노출 — page 의 setTimeout 안에서 호출.
 *
 * Sub-proposal: schedule-page-split-refactor PR 10 (loop iteration 5, utils 패턴 확장).
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";

export interface SessionAddInput {
  subjectId: string;
  studentIds: string[];
  teacherId?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  yPosition?: number;
  room?: string;
  /** YYYY-MM-DD KST 월요일. 미지정 시 fallback (selectedDate 기반). */
  weekStartDate?: string;
}

export interface SessionAddPlan {
  /** 새로 생성된 session — id 는 client UUID */
  newSession: Session;
  /** 새로 생성된 enrollments — 기존 enrollment 재사용 시 빈 배열 */
  newEnrollments: Enrollment[];
  /** updateData 의 sessions 필드 — [...sessions, newSession] */
  mergedSessions: Session[];
  /** updateData 의 enrollments 필드 — newEnrollments 있을 때만 사용 (page 가 분기) */
  mergedEnrollments: Enrollment[];
}

export function planSessionAdd(params: {
  input: SessionAddInput;
  sessions: Session[];
  enrollments: Enrollment[];
  /** input.weekStartDate 가 없을 때 사용할 fallback YYYY-MM-DD */
  fallbackWeekStartDate: string;
}): SessionAddPlan {
  // 1 단계: 각 학생에 대해 enrollment 생성/확인
  const enrollmentIds: string[] = [];
  const newEnrollments: Enrollment[] = [];

  for (const studentId of params.input.studentIds) {
    const existing = params.enrollments.find(
      (e) =>
        e.studentId === studentId && e.subjectId === params.input.subjectId,
    );
    if (existing) {
      enrollmentIds.push(existing.id);
    } else {
      const ne: Enrollment = {
        id: crypto.randomUUID(),
        studentId,
        subjectId: params.input.subjectId,
      };
      newEnrollments.push(ne);
      enrollmentIds.push(ne.id);
    }
  }

  // 2 단계: 세션 생성. weekStartDate 는 input 우선, 없으면 fallback.
  const newSession: Session = {
    id: crypto.randomUUID(),
    subjectId: params.input.subjectId,
    ...(params.input.teacherId && { teacherId: params.input.teacherId }),
    weekday: params.input.weekday,
    startsAt: params.input.startTime,
    endsAt: params.input.endTime,
    weekStartDate: params.input.weekStartDate ?? params.fallbackWeekStartDate,
    room: params.input.room || "",
    enrollmentIds,
    yPosition: params.input.yPosition || 1,
  };

  // 3 단계: merged payload — page 가 updateData 에 전달
  const mergedSessions = [...params.sessions, newSession];
  const mergedEnrollments =
    newEnrollments.length > 0
      ? [...params.enrollments, ...newEnrollments]
      : params.enrollments;

  return {
    newSession,
    newEnrollments,
    mergedSessions,
    mergedEnrollments,
  };
}

/**
 * addSession 의 setTimeout reposition step.
 *
 * ⚠️ Bug fix 배경 (2026-05-04 history): 새 session 생성 직후 lane 충돌 시 다음 빈
 * lane 으로 시각 분리. updateData 직후 setTimeout 안에서 호출 — async timing 으로
 * React state 갱신 이후 실행.
 */
export function buildRepositionedSessionsAfterAdd(params: {
  newSession: Session;
  sessions: Session[];
  enrollments: Enrollment[];
  newEnrollments: Enrollment[];
  subjects: Subject[];
  weekday: number;
  startTime: string;
  endTime: string;
  yPosition: number;
}): { repositionedSessions: Session[]; mergedEnrollments: Enrollment[] } {
  const updatedSessions = [...params.sessions, params.newSession];
  const mergedEnrollments =
    params.newEnrollments.length > 0
      ? [...params.enrollments, ...params.newEnrollments]
      : params.enrollments;

  const repositionedSessions = repositionSessionsUtil(
    updatedSessions,
    mergedEnrollments,
    params.subjects,
    params.weekday,
    params.startTime,
    params.endTime,
    params.yPosition,
    params.newSession.id,
  );

  return { repositionedSessions, mergedEnrollments };
}
