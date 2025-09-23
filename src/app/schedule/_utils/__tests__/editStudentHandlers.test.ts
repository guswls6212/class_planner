import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../../../../lib/planner";
import {
  buildEditStudentAdd,
  buildEditStudentAddClick,
  buildEditStudentInputChange,
} from "../editStudentHandlers";

describe("editStudentHandlers", () => {
  const mockStudents = [
    { id: "student-1", name: "김철수" },
    { id: "student-2", name: "이영희" },
    { id: "student-3", name: "박민수" },
  ];

  const mockEnrollments = [
    { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
    { id: "enrollment-2", studentId: "student-2", subjectId: "subject-1" },
  ];

  const mockEditModalData: Session = {
    id: "session-1",
    startsAt: "09:00",
    endsAt: "10:00",
    weekday: 0,
    room: "A101",
    enrollmentIds: ["enrollment-1"],
  };

  describe("buildEditStudentInputChange", () => {
    it("학생 입력값 변경 시 상태가 올바르게 업데이트되어야 한다", () => {
      const setEditStudentInputValue = vi.fn();
      const handler = buildEditStudentInputChange(setEditStudentInputValue);

      const mockEvent = {
        target: { value: "김철수" },
      } as React.ChangeEvent<HTMLInputElement>;

      handler(mockEvent);

      expect(setEditStudentInputValue).toHaveBeenCalledWith("김철수");
    });
  });

  describe("buildEditStudentAdd", () => {
    let setEditStudentInputValue: ReturnType<typeof vi.fn>;
    let setTempEnrollments: ReturnType<typeof vi.fn>;
    let setEditModalData: ReturnType<typeof vi.fn>;
    let getEditStudentInputValue: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setEditStudentInputValue = vi.fn();
      setTempEnrollments = vi.fn();
      setEditModalData = vi.fn();
      getEditStudentInputValue = vi.fn();
    });

    it("기존 학생을 추가할 때 tempEnrollments에 올바른 id가 포함되어야 한다", () => {
      getEditStudentInputValue.mockReturnValue("김철수");

      const handler = buildEditStudentAdd({
        students: mockStudents,
        enrollments: mockEnrollments,
        editModalData: mockEditModalData,
        getEditStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      });

      // 기존 enrollment가 없는 새로운 학생 추가
      getEditStudentInputValue.mockReturnValue("박민수");

      handler();

      // tempEnrollments에 id가 포함된 객체가 추가되었는지 확인
      expect(setTempEnrollments).toHaveBeenCalledWith(expect.any(Function));

      // setTempEnrollments 콜백 함수 테스트
      const setTempEnrollmentsCallback = setTempEnrollments.mock.calls[0][0];
      const result = setTempEnrollmentsCallback([]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        studentId: "student-3",
        subjectId: "subject-1",
      });
      expect(result[0].id).toBeTruthy(); // id가 빈 문자열이 아닌지 확인
    });

    it("이미 추가된 학생을 다시 추가하려고 하면 무시되어야 한다", () => {
      getEditStudentInputValue.mockReturnValue("김철수");

      const handler = buildEditStudentAdd({
        students: mockStudents,
        enrollments: mockEnrollments,
        editModalData: mockEditModalData,
        getEditStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      });

      handler();

      // 이미 추가된 학생이므로 tempEnrollments나 editModalData가 업데이트되지 않아야 함
      expect(setTempEnrollments).not.toHaveBeenCalled();
      expect(setEditModalData).not.toHaveBeenCalled();
      expect(setEditStudentInputValue).toHaveBeenCalledWith("");
    });

    it("존재하지 않는 학생을 추가하려고 하면 무시되어야 한다", () => {
      getEditStudentInputValue.mockReturnValue("존재하지않는학생");

      const handler = buildEditStudentAdd({
        students: mockStudents,
        enrollments: mockEnrollments,
        editModalData: mockEditModalData,
        getEditStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      });

      handler();

      // 존재하지 않는 학생이므로 아무것도 업데이트되지 않아야 함
      expect(setTempEnrollments).not.toHaveBeenCalled();
      expect(setEditModalData).not.toHaveBeenCalled();
      expect(setEditStudentInputValue).not.toHaveBeenCalled();
    });

    it("studentId로 직접 추가할 때도 올바르게 작동해야 한다", () => {
      const handler = buildEditStudentAdd({
        students: mockStudents,
        enrollments: mockEnrollments,
        editModalData: mockEditModalData,
        getEditStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      });

      handler("student-3");

      // tempEnrollments에 id가 포함된 객체가 추가되었는지 확인
      expect(setTempEnrollments).toHaveBeenCalledWith(expect.any(Function));

      const setTempEnrollmentsCallback = setTempEnrollments.mock.calls[0][0];
      const result = setTempEnrollmentsCallback([]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        studentId: "student-3",
        subjectId: "subject-1",
      });
    });

    it("최대 14명 제한을 초과하면 alert가 표시되어야 한다", () => {
      // 14개의 enrollmentIds가 있는 모달 데이터
      const fullModalData: Session = {
        ...mockEditModalData,
        enrollmentIds: Array.from(
          { length: 14 },
          (_, i) => `enrollment-${i + 1}`
        ),
      };

      const handler = buildEditStudentAdd({
        students: mockStudents,
        enrollments: mockEnrollments,
        editModalData: fullModalData,
        getEditStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      });

      // alert 모킹
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      getEditStudentInputValue.mockReturnValue("박민수");
      handler();

      expect(alertSpy).toHaveBeenCalledWith(
        "최대 14명까지 추가할 수 있습니다."
      );
      // 14명 제한에 걸리면 tempEnrollments는 추가되지 않아야 함
      expect(setTempEnrollments).not.toHaveBeenCalled();
      expect(setEditModalData).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe("buildEditStudentAddClick", () => {
    it("클릭 핸들러가 올바르게 호출되어야 한다", () => {
      const handleEditStudentAdd = vi.fn();
      const handler = buildEditStudentAddClick(handleEditStudentAdd);

      handler();

      expect(handleEditStudentAdd).toHaveBeenCalledWith();
    });
  });
});
