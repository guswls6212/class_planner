import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../../lib/localStorageCrud", () => ({
  getAllTeachersFromLocal: vi.fn(() => []),
  addTeacherToLocal: vi.fn(() => ({ success: false, error: "not mocked" })),
  updateTeacherInLocal: vi.fn(() => ({ success: false })),
  deleteTeacherFromLocal: vi.fn(() => ({ success: false })),
  getTeacherFromLocal: vi.fn(() => null),
}));

vi.mock("../../lib/apiSync", () => ({
  syncTeacherCreate: vi.fn(),
  syncTeacherUpdate: vi.fn(),
  syncTeacherDelete: vi.fn(),
}));

import { useTeacherManagementLocal } from "../useTeacherManagementLocal";
import {
  getAllTeachersFromLocal,
  addTeacherToLocal,
  deleteTeacherFromLocal,
} from "../../lib/localStorageCrud";

const mockTeacher = { id: "t-1", name: "이현진", color: "#f59e0b" };

describe("useTeacherManagementLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAllTeachersFromLocal as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  it("초기 상태는 빈 teachers 배열이다", async () => {
    const { result } = renderHook(() => useTeacherManagementLocal());
    await waitFor(() => expect(result.current.teachers).toHaveLength(0));
    expect(result.current.teacherCount).toBe(0);
  });

  it("addTeacher 성공 시 true를 반환하고 teachers가 갱신된다", async () => {
    (addTeacherToLocal as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: mockTeacher,
    });
    (getAllTeachersFromLocal as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([])          // initial useEffect load
      .mockReturnValueOnce([mockTeacher]); // after addTeacher → loadTeachersFromLocal

    const { result } = renderHook(() => useTeacherManagementLocal());
    await waitFor(() => {}); // let initial effect settle

    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.addTeacher("이현진", "#f59e0b");
    });

    expect(ret).toBe(true);
    expect(addTeacherToLocal).toHaveBeenCalledWith("이현진", "#f59e0b", undefined);
    await waitFor(() => expect(result.current.teachers).toHaveLength(1));
  });

  it("addTeacher 실패 시 false를 반환한다", async () => {
    (addTeacherToLocal as ReturnType<typeof vi.fn>).mockReturnValue({
      success: false,
      error: "중복 강사",
    });
    const { result } = renderHook(() => useTeacherManagementLocal());

    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.addTeacher("이현진", "#f59e0b");
    });
    expect(ret).toBe(false);
  });

  it("deleteTeacher 성공 시 teachers 목록에서 제거된다", async () => {
    (getAllTeachersFromLocal as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([mockTeacher])  // initial load
      .mockReturnValueOnce([]);            // after delete
    (deleteTeacherFromLocal as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
    });

    const { result } = renderHook(() => useTeacherManagementLocal());
    await waitFor(() => expect(result.current.teachers).toHaveLength(1));

    await act(async () => { await result.current.deleteTeacher("t-1"); });
    expect(deleteTeacherFromLocal).toHaveBeenCalledWith("t-1");
    await waitFor(() => expect(result.current.teachers).toHaveLength(0));
  });

  it("teacherCount는 teachers 배열의 길이를 반환한다", async () => {
    (getAllTeachersFromLocal as ReturnType<typeof vi.fn>).mockReturnValue([
      mockTeacher,
    ]);
    const { result } = renderHook(() => useTeacherManagementLocal());
    await waitFor(() => expect(result.current.teacherCount).toBe(1));
  });

  it("refreshTeachers 호출 시 getAllTeachersFromLocal이 재실행된다", async () => {
    const { result } = renderHook(() => useTeacherManagementLocal());
    await waitFor(() => {}); // let init settle
    const callsBefore = (getAllTeachersFromLocal as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => result.current.refreshTeachers());
    const callsAfter = (getAllTeachersFromLocal as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});
