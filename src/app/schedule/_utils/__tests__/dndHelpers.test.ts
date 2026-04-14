import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  buildOpenGroupModalHandler,
  buildHandleDrop,
  buildHandleSessionDrop,
} from "../dndHelpers";

describe("buildOpenGroupModalHandler", () => {
  it("모달 데이터를 설정하고 모달을 연다", () => {
    const setGroupModalData = vi.fn();
    const setShowGroupModal = vi.fn();
    const getNextHour = vi.fn().mockReturnValue("10:00");

    const handler = buildOpenGroupModalHandler(
      setGroupModalData,
      setShowGroupModal,
      getNextHour
    );

    handler(1, "09:00", 2);

    expect(setGroupModalData).toHaveBeenCalledWith({
      studentIds: [],
      subjectId: "",
      weekday: 1,
      startTime: "09:00",
      endTime: "10:00",
      yPosition: 2,
    });
    expect(setShowGroupModal).toHaveBeenCalledWith(true);
  });

  it("yPosition 미지정 시 기본값 1을 사용한다", () => {
    const setGroupModalData = vi.fn();
    const setShowGroupModal = vi.fn();
    const getNextHour = vi.fn().mockReturnValue("10:00");

    const handler = buildOpenGroupModalHandler(
      setGroupModalData,
      setShowGroupModal,
      getNextHour
    );

    handler(1, "09:00");

    expect(setGroupModalData).toHaveBeenCalledWith(
      expect.objectContaining({ yPosition: 1 })
    );
  });
});

describe("buildHandleDrop", () => {
  const createParams = () => ({
    students: [{ id: "stu-1", name: "Kim" }],
    enrollments: [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }],
    setIsStudentDragging: vi.fn(),
    setGroupModalData: vi.fn(),
    setShowGroupModal: vi.fn(),
    getNextHour: vi.fn().mockReturnValue("10:00"),
  });

  it("student: 접두어인 경우 학생 ID로 모달을 연다", () => {
    const params = createParams();
    const handler = buildHandleDrop(params);

    handler(1, "09:00", "student:stu-1", 2);

    expect(params.setGroupModalData).toHaveBeenCalledWith(
      expect.objectContaining({
        studentIds: ["stu-1"],
        weekday: 1,
      })
    );
    expect(params.setShowGroupModal).toHaveBeenCalledWith(true);
  });

  it("enrollment ID인 경우 enrollment의 studentId로 모달을 연다", () => {
    const params = createParams();
    const handler = buildHandleDrop(params);

    handler(1, "09:00", "enr-1", 2);

    expect(params.setGroupModalData).toHaveBeenCalledWith(
      expect.objectContaining({
        studentIds: ["stu-1"],
      })
    );
  });

  it("존재하지 않는 학생은 무시한다", () => {
    const params = createParams();
    const handler = buildHandleDrop(params);

    handler(1, "09:00", "student:unknown-id", 1);

    expect(params.setShowGroupModal).not.toHaveBeenCalled();
  });

  it("존재하지 않는 enrollment은 무시한다", () => {
    const params = createParams();
    const handler = buildHandleDrop(params);

    handler(1, "09:00", "unknown-enrollment", 1);

    expect(params.setShowGroupModal).not.toHaveBeenCalled();
  });
});

describe("buildHandleSessionDrop", () => {
  it("updateSessionPosition 성공 시 gridVersion을 증가시킨다", async () => {
    const updateSessionPosition = vi.fn().mockResolvedValue(undefined);
    const setGridVersion = vi.fn();

    const handler = buildHandleSessionDrop({
      updateSessionPosition,
      setGridVersion,
    });

    await handler("sess-1", 1, "09:00", 2);

    expect(updateSessionPosition).toHaveBeenCalledWith("sess-1", 1, "09:00", 2);
    expect(setGridVersion).toHaveBeenCalled();
  });

  it("updateSessionPosition 실패 시 alert를 표시한다", async () => {
    const updateSessionPosition = vi.fn().mockRejectedValue(new Error("fail"));
    const setGridVersion = vi.fn();
    vi.stubGlobal("alert", vi.fn());

    const handler = buildHandleSessionDrop({
      updateSessionPosition,
      setGridVersion,
    });

    await handler("sess-1", 1, "09:00", 2);

    expect(setGridVersion).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
  });
});
