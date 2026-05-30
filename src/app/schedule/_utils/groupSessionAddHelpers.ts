/**
 * addGroupSession 의 validation + addSession payload 빌드 logic 만 pure function.
 *
 * 기존: schedule/page.tsx 의 addGroupSession (71 줄) 가 validateAndToastGroup + 가드
 * 3 종 + payload + movedToOtherWeek 결정 + addSession await + setSelectedDate +
 * showToast 모두 inline.
 *
 * 본 utils: **state mutation / async 안 함**. validation 통과 시 SessionAddInput +
 * movedToOtherWeek flag 반환. 실패 시 reason 반환 — page 가 토스트/error state 결정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 15 (loop iteration 10, utils 패턴 확장).
 */

import type { GroupSessionData } from "@/types/scheduleTypes";
import type { SessionAddInput } from "./sessionAddHelpers";

export type GroupSessionAddFailureReason =
  | "time-invalid"
  | "no-subject"
  | "no-students";

export interface GroupSessionAddPlan {
  ok: true;
  addSessionInput: SessionAddInput;
  /** weekStartDate 가 currentWeekStart 와 다르면 true → page 가 setSelectedDate 호출 */
  movedToOtherWeek: boolean;
}

export interface GroupSessionAddFailure {
  ok: false;
  reason: GroupSessionAddFailureReason;
}

export function planGroupSessionAdd(params: {
  data: GroupSessionData;
  currentWeekStart: string;
  /** validateAndToastGroup 호출 결과 — true=valid. page 가 invalid 시 setGroupTimeError + 토스트 처리 */
  timeValid: boolean;
}): GroupSessionAddPlan | GroupSessionAddFailure {
  if (!params.timeValid) {
    return { ok: false, reason: "time-invalid" };
  }

  if (!params.data.subjectId) {
    return { ok: false, reason: "no-subject" };
  }

  if (!params.data.studentIds || params.data.studentIds.length === 0) {
    return { ok: false, reason: "no-students" };
  }

  // 사용자가 캘린더에서 다른 주 날짜 선택 시 그 주 weekStartDate 를 forward.
  // currentWeekStart 와 다르면 page 가 setSelectedDate 로 시간표 navigate.
  const movedToOtherWeek =
    params.data.weekStartDate !== undefined &&
    params.data.weekStartDate !== params.currentWeekStart;

  return {
    ok: true,
    addSessionInput: {
      studentIds: params.data.studentIds,
      subjectId: params.data.subjectId,
      teacherId: params.data.teacherId,
      weekday: params.data.weekday,
      startTime: params.data.startTime,
      endTime: params.data.endTime,
      room: params.data.room,
      yPosition: params.data.yPosition || 1,
      weekStartDate: params.data.weekStartDate,
    },
    movedToOtherWeek,
  };
}
