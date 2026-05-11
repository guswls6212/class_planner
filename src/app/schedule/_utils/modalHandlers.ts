import type { GroupSessionData } from "../../../types/scheduleTypes";
import { logger } from "../../../lib/logger";

export function buildGroupTimeChangeHandlers(
  validateTimeRange: (startTime: string, endTime: string) => boolean,
  setGroupModalData: (
    updater: GroupSessionData | ((prev: GroupSessionData) => GroupSessionData)
  ) => void,
  setGroupTimeError: (msg: string) => void,
) {
  const TIME_INVALID_MSG = "종료 시간은 시작 시간보다 늦어야 합니다.";

  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData((prev) => {
      const currentEndTime = prev.endTime;
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        logger.warn("시작 시간이 종료 시간보다 늦습니다.");
        setGroupTimeError(TIME_INVALID_MSG);
      } else {
        setGroupTimeError("");
      }
      return { ...prev, startTime: newStartTime };
    });
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setGroupModalData((prev) => {
      const currentStartTime = prev.startTime;
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        logger.warn("종료 시간이 시작 시간보다 빠릅니다.");
        setGroupTimeError(TIME_INVALID_MSG);
      } else {
        setGroupTimeError("");
      }
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
