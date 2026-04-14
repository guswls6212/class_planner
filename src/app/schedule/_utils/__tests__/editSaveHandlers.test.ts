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
  it("confirm 후 deleteSession을 호출하고 모달을 닫는다", async () => {
    const deleteSession = vi.fn().mockResolvedValue(undefined);
    const setShowEditModal = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

    const onDelete = buildEditOnDelete({
      editModalData: { id: "sess-1", weekday: 1, startsAt: "09:00", endsAt: "10:00" } as any,
      deleteSession,
      setShowEditModal,
    });

    await onDelete();

    expect(deleteSession).toHaveBeenCalledWith("sess-1");
    expect(setShowEditModal).toHaveBeenCalledWith(false);
  });

  it("confirm 취소 시 deleteSession을 호출하지 않는다", async () => {
    const deleteSession = vi.fn();
    const setShowEditModal = vi.fn();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

    const onDelete = buildEditOnDelete({
      editModalData: { id: "sess-1", weekday: 1, startsAt: "09:00", endsAt: "10:00" } as any,
      deleteSession,
      setShowEditModal,
    });

    await onDelete();

    expect(deleteSession).not.toHaveBeenCalled();
    expect(setShowEditModal).not.toHaveBeenCalled();
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
