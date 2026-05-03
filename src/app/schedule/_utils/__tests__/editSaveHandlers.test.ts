import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { buildEditOnCancel, buildEditOnDelete } from "../editSaveHandlers";

describe("buildEditOnCancel", () => {
  it("모달을 닫고 tempSubjectId를 초기화한다", () => {
    const setShowEditModal = vi.fn();
    const setTempSubjectId = vi.fn();

    const onCancel = buildEditOnCancel({ setShowEditModal, setTempSubjectId });
    onCancel();

    expect(setShowEditModal).toHaveBeenCalledWith(false);
    expect(setTempSubjectId).toHaveBeenCalledWith("");
  });
});

describe("buildEditOnDelete", () => {
  // confirm 알림 제거됨 (학생/과목/강사 일관성). 5초 undo 토스트가 안전망 역할.

  it("editModalData가 있으면 deleteSession을 호출하고 모달을 닫는다", async () => {
    const deleteSession = vi.fn().mockResolvedValue(undefined);
    const setShowEditModal = vi.fn();

    const onDelete = buildEditOnDelete({
      editModalData: { id: "sess-1", weekday: 1, startsAt: "09:00", endsAt: "10:00" } as any,
      deleteSession,
      setShowEditModal,
    });

    await onDelete();

    expect(deleteSession).toHaveBeenCalledWith("sess-1");
    expect(setShowEditModal).toHaveBeenCalledWith(false);
  });

  it("editModalData가 null이면 아무것도 하지 않는다", async () => {
    const deleteSession = vi.fn();
    const setShowEditModal = vi.fn();

    const onDelete = buildEditOnDelete({
      editModalData: null,
      deleteSession,
      setShowEditModal,
    });

    await onDelete();

    expect(deleteSession).not.toHaveBeenCalled();
  });
});
