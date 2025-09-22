import type {
  EditModalTimeData,
  GroupSessionData,
} from "../types/scheduleTypes";

export const useTimeValidation = () => {
  // 시간 유효성 검사 함수
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;

    const startMinutes =
      parseInt(startTime.split(":")[0]) * 60 +
      parseInt(startTime.split(":")[1]);
    const endMinutes =
      parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);

    return startMinutes < endMinutes;
  };

  // 최대 지속 시간(분) 제한 검증 - 기본 480분(8시간)
  const validateDurationWithinLimit = (
    startTime: string,
    endTime: string,
    maxMinutes = 480
  ): boolean => {
    if (!startTime || !endTime) return false;
    const startMinutes =
      parseInt(startTime.split(":")[0]) * 60 +
      parseInt(startTime.split(":")[1]);
    const endMinutes =
      parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
    const duration = endMinutes - startMinutes;
    return duration <= maxMinutes;
  };

  // 다음 시간 계산
  const getNextHour = (time: string): string => {
    const [hours, minutes] = time.split(":").map(Number);
    const nextHour = hours + 1;
    return `${nextHour.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // 시작 시간 변경 처리
  const handleStartTimeChange = (
    newStartTime: string,
    currentEndTime: string,
    onUpdate: (data: Partial<GroupSessionData | EditModalTimeData>) => void
  ) => {
    if (
      newStartTime &&
      currentEndTime &&
      !validateTimeRange(newStartTime, currentEndTime)
    ) {
      console.warn("시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요.");
    }

    onUpdate({ startTime: newStartTime });
  };

  // 종료 시간 변경 처리
  const handleEndTimeChange = (
    newEndTime: string,
    currentStartTime: string,
    onUpdate: (data: Partial<GroupSessionData | EditModalTimeData>) => void
  ) => {
    if (
      newEndTime &&
      currentStartTime &&
      !validateTimeRange(currentStartTime, newEndTime)
    ) {
      console.warn("종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요.");
    }

    onUpdate({ endTime: newEndTime });
  };

  return {
    validateTimeRange,
    validateDurationWithinLimit,
    getNextHour,
    handleStartTimeChange,
    handleEndTimeChange,
  };
};
