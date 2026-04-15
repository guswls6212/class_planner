import { describe, expect, it, vi } from "vitest";
import { logger } from "../../../../lib/logger";
import {
  buildGroupTimeChangeHandlers,
  buildEditTimeChangeHandlers,
} from "../modalHandlers";

describe("buildGroupTimeChangeHandlers", () => {
  it("handleStartTimeChange가 setGroupModalData를 호출한다", () => {
    const validateTimeRange = vi.fn().mockReturnValue(true);
    const setGroupModalData = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData
    );

    handleStartTimeChange("10:00");
    expect(setGroupModalData).toHaveBeenCalledTimes(1);

    // updater function 실행
    const updater = setGroupModalData.mock.calls[0][0];
    const result = updater({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "09:00",
      endTime: "11:00",
      yPosition: 1,
    });
    expect(result.startTime).toBe("10:00");
  });

  it("handleEndTimeChange가 setGroupModalData를 호출한다", () => {
    const validateTimeRange = vi.fn().mockReturnValue(true);
    const setGroupModalData = vi.fn();

    const { handleEndTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData
    );

    handleEndTimeChange("12:00");
    expect(setGroupModalData).toHaveBeenCalledTimes(1);

    const updater = setGroupModalData.mock.calls[0][0];
    const result = updater({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "09:00",
      endTime: "11:00",
      yPosition: 1,
    });
    expect(result.endTime).toBe("12:00");
  });

  it("유효하지 않은 시간 범위에서 경고를 출력한다", () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const validateTimeRange = vi.fn().mockReturnValue(false);
    const setGroupModalData = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData
    );

    handleStartTimeChange("15:00");
    const updater = setGroupModalData.mock.calls[0][0];
    updater({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "09:00",
      endTime: "11:00",
      yPosition: 1,
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("buildEditTimeChangeHandlers", () => {
  const createParams = () => ({
    validateTimeRange: vi.fn().mockReturnValue(true),
    validateDurationWithinLimit: vi.fn().mockReturnValue(true),
    maxMinutes: 180,
    setEditModalTimeData: vi.fn(),
    setEditTimeError: vi.fn(),
    endBeforeStartMsg: "end before start",
    tooLongMsg: "too long",
  });

  it("handleEditStartTimeChange가 time data를 업데이트한다", () => {
    const params = createParams();
    const { handleEditStartTimeChange } = buildEditTimeChangeHandlers(params);

    handleEditStartTimeChange("10:00");
    expect(params.setEditModalTimeData).toHaveBeenCalledTimes(1);

    const updater = params.setEditModalTimeData.mock.calls[0][0];
    const result = updater({ startTime: "09:00", endTime: "11:00" });
    expect(result.startTime).toBe("10:00");
  });

  it("유효한 시간 범위에서 에러를 클리어한다", () => {
    const params = createParams();
    const { handleEditStartTimeChange } = buildEditTimeChangeHandlers(params);

    handleEditStartTimeChange("10:00");
    const updater = params.setEditModalTimeData.mock.calls[0][0];
    updater({ startTime: "09:00", endTime: "11:00" });

    expect(params.setEditTimeError).toHaveBeenCalledWith("");
  });

  it("유효하지 않은 시간 범위에서 에러 메시지를 설정한다", () => {
    const params = createParams();
    params.validateTimeRange.mockReturnValue(false);
    const { handleEditEndTimeChange } = buildEditTimeChangeHandlers(params);

    handleEditEndTimeChange("08:00");
    const updater = params.setEditModalTimeData.mock.calls[0][0];
    updater({ startTime: "09:00", endTime: "11:00" });

    expect(params.setEditTimeError).toHaveBeenCalledWith("end before start");
  });

  it("최대 시간 초과 시 에러 메시지를 설정한다", () => {
    const params = createParams();
    params.validateTimeRange.mockReturnValue(true);
    params.validateDurationWithinLimit.mockReturnValue(false);
    const { handleEditStartTimeChange } = buildEditTimeChangeHandlers(params);

    handleEditStartTimeChange("06:00");
    const updater = params.setEditModalTimeData.mock.calls[0][0];
    updater({ startTime: "09:00", endTime: "15:00" });

    expect(params.setEditTimeError).toHaveBeenCalledWith("too long");
  });
});
