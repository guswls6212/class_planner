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
    const setGroupTimeError = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
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
    expect(setGroupTimeError).toHaveBeenCalledWith("");
  });

  it("handleEndTimeChange가 setGroupModalData를 호출한다", () => {
    const validateTimeRange = vi.fn().mockReturnValue(true);
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    const { handleEndTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
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
    expect(setGroupTimeError).toHaveBeenCalledWith("");
  });

  it("유효하지 않은 시간 범위에서 setGroupTimeError 를 설정한다", () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const validateTimeRange = vi.fn().mockReturnValue(false);
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
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
    expect(setGroupTimeError).toHaveBeenCalledWith(
      "종료 시간은 시작 시간보다 늦어야 합니다.",
    );
    warnSpy.mockRestore();
  });

  // ──────────────────────────────────────────────────────────────────────
  // UAT 2026-05-20 사고: 8시간 max 검증이 picker change 시점에 없어 Step 1→2
  // transition 통과 후 Step 3 submit 에서 silent fail. 본 PR 에서
  // validateDurationWithinLimit 를 받아 picker 시점에 즉시 set.
  // ──────────────────────────────────────────────────────────────────────

  it("8시간 초과 시 (11시간) handleEndTimeChange 가 max duration error 설정", () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const validateTimeRange = vi.fn().mockReturnValue(true); // 시작<종료 OK
    const validateDurationWithinLimit = vi
      .fn()
      .mockReturnValue(false); // 8시간 초과
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    const { handleEndTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
      validateDurationWithinLimit,
      480,
    );

    handleEndTimeChange("22:00");
    const updater = setGroupModalData.mock.calls[0][0];
    updater({
      studentIds: [],
      subjectId: "",
      weekday: 6,
      startTime: "11:00",
      endTime: "22:00",
      yPosition: 1,
    });

    expect(validateDurationWithinLimit).toHaveBeenCalledWith(
      "11:00",
      "22:00",
      480,
    );
    expect(setGroupTimeError).toHaveBeenCalledWith(
      "세션 시간은 최대 8시간까지 설정할 수 있습니다.",
    );
    warnSpy.mockRestore();
  });

  it("정상 시간 범위 (≤8시간) + validateDurationWithinLimit 전달 시 error clear", () => {
    const validateTimeRange = vi.fn().mockReturnValue(true);
    const validateDurationWithinLimit = vi.fn().mockReturnValue(true);
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
      validateDurationWithinLimit,
      480,
    );

    handleStartTimeChange("14:00");
    const updater = setGroupModalData.mock.calls[0][0];
    updater({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "10:00",
      endTime: "18:00",
      yPosition: 1,
    });

    expect(setGroupTimeError).toHaveBeenCalledWith("");
  });

  it("validateDurationWithinLimit 미전달 시 legacy 호환 (duration 검증 skip)", () => {
    const validateTimeRange = vi.fn().mockReturnValue(true);
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    // 4-인자 호출 (legacy)
    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
    );

    handleStartTimeChange("11:00");
    const updater = setGroupModalData.mock.calls[0][0];
    updater({
      studentIds: [],
      subjectId: "",
      weekday: 6,
      startTime: "11:00",
      endTime: "22:00", // 11시간 — 검증 함수 미전달이라 통과 (legacy 동작)
      yPosition: 1,
    });

    // duration 검증 skip → time range 만 OK 면 error clear
    expect(setGroupTimeError).toHaveBeenCalledWith("");
  });

  it("시간 범위 invalid + duration 검증 함수 전달 시 → time range error 가 우선 (duration check 안 함)", () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const validateTimeRange = vi.fn().mockReturnValue(false); // 시작 ≥ 종료
    const validateDurationWithinLimit = vi.fn();
    const setGroupModalData = vi.fn();
    const setGroupTimeError = vi.fn();

    const { handleStartTimeChange } = buildGroupTimeChangeHandlers(
      validateTimeRange,
      setGroupModalData,
      setGroupTimeError,
      validateDurationWithinLimit,
      480,
    );

    handleStartTimeChange("23:00");
    const updater = setGroupModalData.mock.calls[0][0];
    updater({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "23:00",
      endTime: "01:00",
      yPosition: 1,
    });

    // time range invalid 가 먼저 트리거 → duration 검증 함수 호출 안 됨
    expect(validateDurationWithinLimit).not.toHaveBeenCalled();
    expect(setGroupTimeError).toHaveBeenCalledWith(
      "종료 시간은 시작 시간보다 늦어야 합니다.",
    );
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
