import { act, renderHook } from "@testing-library/react";
import { useEditModalState } from "../../_hooks/useEditModalState";

describe("useEditModalState", () => {
  it("초기 상태를 올바르게 제공한다", () => {
    const { result } = renderHook(() => useEditModalState());
    expect(result.current.showEditModal).toBe(false);
    expect(result.current.editModalData).toBeNull();
    expect(result.current.tempSubjectId).toBe("");
    expect(result.current.tempEnrollments).toEqual([]);
    expect(result.current.editStudentInputValue).toBe("");
    expect(result.current.editModalTimeData).toEqual({
      startTime: "",
      endTime: "",
    });
    expect(result.current.editTimeError).toBe("");
  });

  it("setter를 통해 상태를 갱신할 수 있다", () => {
    const { result } = renderHook(() => useEditModalState());
    act(() => {
      result.current.setShowEditModal(true);
      result.current.setTempSubjectId("sub-1");
      result.current.setTempEnrollments([
        { id: "temp-1", studentId: "st-1", subjectId: "sub-1" },
      ]);
      result.current.setEditStudentInputValue("홍길동");
      result.current.setEditModalTimeData({
        startTime: "10:00",
        endTime: "11:00",
      });
      result.current.setEditTimeError("error");
    });
    expect(result.current.showEditModal).toBe(true);
    expect(result.current.tempSubjectId).toBe("sub-1");
    expect(result.current.tempEnrollments).toEqual([
      { id: "temp-1", studentId: "st-1", subjectId: "sub-1" },
    ]);
    expect(result.current.editStudentInputValue).toBe("홍길동");
    expect(result.current.editModalTimeData).toEqual({
      startTime: "10:00",
      endTime: "11:00",
    });
    expect(result.current.editTimeError).toBe("error");
  });
});
