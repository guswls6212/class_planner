import type { GroupSessionData } from "../../../types/scheduleTypes";

export function buildGroupTimeChangeHandlers(
  validateTimeRange: (startTime: string, endTime: string) => boolean,
  setGroupModalData: (
    updater: GroupSessionData | ((prev: GroupSessionData) => GroupSessionData)
  ) => void
) {
  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData((prev) => {
      const currentEndTime = prev.endTime;
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        console.warn(
          "시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요."
        );
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
        console.warn(
          "종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요."
        );
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
