import type { GroupSessionData } from "../../../types/scheduleTypes";
import { logger } from "../../../lib/logger";

export function buildGroupTimeChangeHandlers(
  validateTimeRange: (startTime: string, endTime: string) => boolean,
  setGroupModalData: (
    updater: GroupSessionData | ((prev: GroupSessionData) => GroupSessionData)
  ) => void,
  setGroupTimeError: (msg: string) => void,
  /**
   * 최대 지속 시간(분) 검증 — picker change 시점에 즉시 8시간 초과 감지.
   * 미전달 시 duration 검증 skip (legacy 호환). 신규 호출자는 항상 전달 권장.
   *
   * Background: Step 1 (과목&시간) → Step 2 (확인) transition 게이트가
   * !groupTimeError 만 체크 → picker 가 8시간 초과 감지 못 하면 Step 2 로
   * 진행 → addGroupSession 시점에서야 validateAndToastGroup 가 setError 하지만
   * Step 2 UI 에 error 표시 자리 없어 silent fail. picker 변경 시점에서
   * 잡아야 사용자가 Step 1 에서 막힘.
   */
  validateDurationWithinLimit?: (
    startTime: string,
    endTime: string,
    maxMinutes: number
  ) => boolean,
  maxMinutes = 480,
) {
  const TIME_INVALID_MSG = "종료 시간은 시작 시간보다 늦어야 합니다.";
  const DURATION_TOO_LONG_MSG = "세션 시간은 최대 8시간까지 설정할 수 있습니다.";

  const computeError = (startTime: string, endTime: string): string => {
    if (!startTime || !endTime) return "";
    if (!validateTimeRange(startTime, endTime)) return TIME_INVALID_MSG;
    if (
      validateDurationWithinLimit &&
      !validateDurationWithinLimit(startTime, endTime, maxMinutes)
    ) {
      return DURATION_TOO_LONG_MSG;
    }
    return "";
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData((prev) => {
      const currentEndTime = prev.endTime;
      const err = computeError(newStartTime, currentEndTime);
      if (err === TIME_INVALID_MSG) {
        logger.warn("시작 시간이 종료 시간보다 늦습니다.");
      } else if (err === DURATION_TOO_LONG_MSG) {
        logger.warn("세션 시간이 최대 한도(8시간)를 초과했습니다.");
      }
      setGroupTimeError(err);
      return { ...prev, startTime: newStartTime };
    });
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setGroupModalData((prev) => {
      const currentStartTime = prev.startTime;
      const err = computeError(currentStartTime, newEndTime);
      if (err === TIME_INVALID_MSG) {
        logger.warn("종료 시간이 시작 시간보다 빠릅니다.");
      } else if (err === DURATION_TOO_LONG_MSG) {
        logger.warn("세션 시간이 최대 한도(8시간)를 초과했습니다.");
      }
      setGroupTimeError(err);
      return { ...prev, endTime: newEndTime };
    });
  };

  return { handleStartTimeChange, handleEndTimeChange };
}

export function buildEditTimeChangeHandlers(params: {
  validateTimeRange: (start: string, end: string) => boolean;
  validateDurationWithinLimit: (
    start: string,
    end: string,
    maxMinutes: number
  ) => boolean;
  maxMinutes: number;
  setEditModalTimeData: (
    updater:
      | { startTime: string; endTime: string }
      | ((prev: { startTime: string; endTime: string }) => {
          startTime: string;
          endTime: string;
        })
  ) => void;
  setEditTimeError: (msg: string) => void;
  endBeforeStartMsg: string;
  tooLongMsg: string;
}) {
  const {
    validateTimeRange,
    validateDurationWithinLimit,
    maxMinutes,
    setEditModalTimeData,
    setEditTimeError,
    endBeforeStartMsg,
    tooLongMsg,
  } = params;

  const handleEditStartTimeChange = (newStartTime: string) => {
    setEditModalTimeData((prev) => {
      const currentEndTime = prev.endTime;

      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        setEditTimeError(endBeforeStartMsg);
      }

      if (
        newStartTime &&
        currentEndTime &&
        !validateDurationWithinLimit(newStartTime, currentEndTime, maxMinutes)
      ) {
        setEditTimeError(tooLongMsg);
      }

      if (
        newStartTime &&
        currentEndTime &&
        validateTimeRange(newStartTime, currentEndTime) &&
        validateDurationWithinLimit(newStartTime, currentEndTime, maxMinutes)
      ) {
        setEditTimeError("");
      }

      return { ...prev, startTime: newStartTime };
    });
  };

  const handleEditEndTimeChange = (newEndTime: string) => {
    setEditModalTimeData((prev) => {
      const currentStartTime = prev.startTime;

      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        setEditTimeError(endBeforeStartMsg);
      }

      if (
        newEndTime &&
        currentStartTime &&
        !validateDurationWithinLimit(currentStartTime, newEndTime, maxMinutes)
      ) {
        setEditTimeError(tooLongMsg);
      }

      if (
        newEndTime &&
        currentStartTime &&
        validateTimeRange(currentStartTime, newEndTime) &&
        validateDurationWithinLimit(currentStartTime, newEndTime, maxMinutes)
      ) {
        setEditTimeError("");
      }

      return { ...prev, endTime: newEndTime };
    });
  };

  return { handleEditStartTimeChange, handleEditEndTimeChange };
}
