/**
 * updateSession 의 핵심 logic 만 pure function 으로 추출.
 *
 * 기존: schedule/page.tsx 의 updateSession (76 줄) 가 sessions map (시간 필드명 변환
 * + 필드 병합) + reposition + updateData + sync 모두 inline.
 *
 * 본 utils: **state mutation / async 안 함**. map + reposition 까지 pure. updateData
 * / syncSessionUpdate / logger 는 page 가 호출.
 *
 * 시간 필드 변환 (startTime/endTime → startsAt/endsAt) 은 update input 의 명명 컨벤션
 * 차이 — input 은 page modal 의 form 명명, internal Session 은 startsAt/endsAt.
 *
 * Sub-proposal: schedule-page-split-refactor PR 11 (loop iteration 6, utils 패턴 확장).
 */

import type { Session, Enrollment, Subject } from "@/lib/planner";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";

export interface SessionUpdateInput {
  startTime?: string;
  endTime?: string;
  weekday?: number;
  /** YYYY-MM-DD. 다른 주로 세션 이동 시 forward. 미지정이면 기존 weekStartDate 유지. */
  weekStartDate?: string;
  room?: string;
  yPosition?: number;
  subjectId?: string;
  studentIds?: string[];
  enrollmentIds?: string[];
  teacherId?: string | null;
}

export interface SessionUpdatePlan {
  /** updateData payload — repositioned sessions */
  mergedSessions: Session[];
  /** repositioned 후의 target session — sync payload 빌드용. undefined 시 reposition 직후 session 사라짐 (희박) */
  changedSession: Session | undefined;
  /** sync payload 분기에 쓰일 flags */
  hasTeacherId: boolean;
  hasWeekStartDate: boolean;
}

export function planSessionUpdate(params: {
  sessionId: string;
  input: SessionUpdateInput;
  sessions: Session[];
  enrollments: Enrollment[];
  subjects: Subject[];
}): SessionUpdatePlan {
  // 1 단계: sessions map — target 만 update.
  // 시간 필드명 변환 (startTime/endTime → startsAt/endsAt) + 나머지 필드 spread.
  const newSessions = params.sessions.map((s) => {
    if (s.id !== params.sessionId) return s;
    const updatedSession = {
      ...s,
      ...params.input,
      startsAt: params.input.startTime || s.startsAt,
      endsAt: params.input.endTime || s.endsAt,
    } as Session & SessionUpdateInput;
    // 불필요한 필드 제거 (input 명명 → session 명명 변환 후 source 삭제)
    delete updatedSession.startTime;
    delete updatedSession.endTime;
    return updatedSession as Session;
  });

  // 2 단계: reposition target.
  const target = newSessions.find((s) => s.id === params.sessionId);
  const targetWeekday = target?.weekday ?? params.input.weekday ?? 0;
  const targetStartTime = (target?.startsAt ?? params.input.startTime) || "";
  const targetEndTime = (target?.endsAt ?? params.input.endTime) || "";
  const targetYPosition = target?.yPosition || 1;

  const repositioned = repositionSessionsUtil(
    newSessions,
    params.enrollments,
    params.subjects,
    targetWeekday,
    targetStartTime,
    targetEndTime,
    targetYPosition,
    params.sessionId,
  );

  const changedSession = repositioned.find((s) => s.id === params.sessionId);
  // hasTeacherId / hasWeekStartDate 는 input 객체에 key 가 존재하는지 (null 도 valid).
  const hasTeacherId = "teacherId" in (params.input as object);
  const hasWeekStartDate = params.input.weekStartDate !== undefined;

  return {
    mergedSessions: repositioned,
    changedSession,
    hasTeacherId,
    hasWeekStartDate,
  };
}
