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

  // 토스트 이벤트 트리거 유틸
  const dispatchToast = (type: "error" | "success", message: string) => {
    window.dispatchEvent(
      new CustomEvent("toast", {
        detail: { type, message },
      })
    );
  };

  // 시간 검증 + 토스트 트리거 (그룹 모달용)
  const validateAndToastGroup = (
    startTime: string,
    endTime: string,
    setError: (error: string) => void
  ): boolean => {
    if (!validateTimeRange(startTime, endTime)) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.");
      return false;
    }
    if (!validateDurationWithinLimit(startTime, endTime, 480)) {
      setError("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
      return false;
    }
    setError("");
    return true;
  };

  // 시간 검증 + 토스트 트리거 (편집 모달용)
  const validateAndToastEdit = (
    startTime: string,
    endTime: string
  ): boolean => {
    if (!validateTimeRange(startTime, endTime)) {
      dispatchToast("error", "종료 시간은 시작 시간보다 늦어야 합니다.");
      return false;
    }
    if (!validateDurationWithinLimit(startTime, endTime, 480)) {
      dispatchToast("error", "세션 시간은 최대 8시간까지 설정할 수 있습니다.");
      return false;
    }
    return true;
  };

  return {
    validateTimeRange,
    validateDurationWithinLimit,
    getNextHour,
    dispatchToast,
    validateAndToastGroup,
    validateAndToastEdit,
  };
};
