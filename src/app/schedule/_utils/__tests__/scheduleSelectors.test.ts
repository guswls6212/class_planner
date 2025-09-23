import { describe, expect, it } from "vitest";
import type { Enrollment, Student } from "../../../../lib/planner";
import {
  buildSelectedStudents,
  filterEditableStudents,
} from "../scheduleSelectors";

describe("scheduleSelectors", () => {
  const mockStudents: Student[] = [
    { id: "student-1", name: "김철수" },
    { id: "student-2", name: "이영희" },
    { id: "student-3", name: "박민수" },
  ];

  const mockEnrollments: Enrollment[] = [
    { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
    { id: "enrollment-2", studentId: "student-2", subjectId: "subject-1" },
  ];

  const mockTempEnrollments: Enrollment[] = [
    { id: "temp-enrollment-1", studentId: "student-3", subjectId: "subject-1" },
  ];

  describe("buildSelectedStudents", () => {
    it("기존 enrollments만 있을 때 올바른 학생 목록을 반환해야 한다", () => {
      const enrollmentIds = ["enrollment-1", "enrollment-2"];
      const result = buildSelectedStudents(
        enrollmentIds,
        mockEnrollments,
        [],
        mockStudents
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
      ]);
    });

    it("tempEnrollments가 있을 때 올바른 학생 목록을 반환해야 한다", () => {
      const enrollmentIds = ["enrollment-1", "temp-enrollment-1"];
      const result = buildSelectedStudents(
        enrollmentIds,
        mockEnrollments,
        mockTempEnrollments,
        mockStudents
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: "student-1", name: "김철수" },
        { id: "student-3", name: "박민수" },
      ]);
    });

    it("기존 enrollments와 tempEnrollments가 혼재할 때 올바른 학생 목록을 반환해야 한다", () => {
      const enrollmentIds = [
        "enrollment-1",
        "enrollment-2",
        "temp-enrollment-1",
      ];
      const result = buildSelectedStudents(
        enrollmentIds,
        mockEnrollments,
        mockTempEnrollments,
        mockStudents
      );

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
        { id: "student-3", name: "박민수" },
      ]);
    });

    it("enrollmentIds가 빈 배열일 때 빈 배열을 반환해야 한다", () => {
      const result = buildSelectedStudents(
        [],
        mockEnrollments,
        mockTempEnrollments,
        mockStudents
      );
      expect(result).toEqual([]);
    });

    it("enrollmentIds가 undefined일 때 빈 배열을 반환해야 한다", () => {
      const result = buildSelectedStudents(
        undefined,
        mockEnrollments,
        mockTempEnrollments,
        mockStudents
      );
      expect(result).toEqual([]);
    });

    it("존재하지 않는 enrollmentId가 포함되어 있어도 null을 필터링해야 한다", () => {
      const enrollmentIds = ["enrollment-1", "non-existent-enrollment"];
      const result = buildSelectedStudents(
        enrollmentIds,
        mockEnrollments,
        [],
        mockStudents
      );

      expect(result).toHaveLength(1);
      expect(result).toEqual([{ id: "student-1", name: "김철수" }]);
    });

    it("tempEnrollments의 id가 빈 문자열이어서는 안 된다 - 핵심 테스트", () => {
      const tempEnrollmentsWithEmptyId: Enrollment[] = [
        { id: "", studentId: "student-3", subjectId: "subject-1" },
      ];

      const enrollmentIds = ["temp-enrollment-1"];
      const result = buildSelectedStudents(
        enrollmentIds,
        [],
        tempEnrollmentsWithEmptyId,
        mockStudents
      );

      // 빈 문자열 id로는 매칭되지 않아야 함
      expect(result).toEqual([]);
    });

    it("tempEnrollments의 id가 올바르게 설정되어 있어야 한다 - 핵심 테스트", () => {
      const tempEnrollmentsWithValidId: Enrollment[] = [
        { id: "valid-temp-id", studentId: "student-3", subjectId: "subject-1" },
      ];

      const enrollmentIds = ["valid-temp-id"];
      const result = buildSelectedStudents(
        enrollmentIds,
        [],
        tempEnrollmentsWithValidId,
        mockStudents
      );

      // 올바른 id로는 매칭되어야 함
      expect(result).toEqual([{ id: "student-3", name: "박민수" }]);
    });

    it("학생을 찾을 수 없는 enrollment는 null로 처리되어야 한다", () => {
      const enrollmentWithUnknownStudent: Enrollment[] = [
        {
          id: "enrollment-unknown",
          studentId: "unknown-student",
          subjectId: "subject-1",
        },
      ];

      const enrollmentIds = ["enrollment-unknown"];
      const result = buildSelectedStudents(
        enrollmentIds,
        enrollmentWithUnknownStudent,
        [],
        mockStudents
      );

      expect(result).toEqual([]);
    });
  });

  describe("filterEditableStudents", () => {
    it("쿼리에 매칭되는 학생들을 반환해야 한다 (이미 추가되지 않은 학생만)", () => {
      const result = filterEditableStudents(
        "이",
        mockEditModalData,
        mockEnrollments,
        mockStudents
      );

      expect(result).toEqual([{ id: "student-2", name: "이영희" }]);
    });

    it("대소문자 구분 없이 매칭되어야 한다", () => {
      const result = filterEditableStudents(
        "박",
        mockEditModalData,
        mockEnrollments,
        mockStudents
      );

      expect(result).toEqual([{ id: "student-3", name: "박민수" }]);
    });

    it("빈 쿼리일 때 이미 추가되지 않은 학생들만 반환해야 한다", () => {
      const result = filterEditableStudents(
        "",
        mockEditModalData,
        mockEnrollments,
        mockStudents
      );

      // 김철수(student-1)는 이미 추가되어 있으므로 제외
      expect(result).toEqual([
        { id: "student-2", name: "이영희" },
        { id: "student-3", name: "박민수" },
      ]);
    });

    it("매칭되는 학생이 없을 때 빈 배열을 반환해야 한다", () => {
      const result = filterEditableStudents(
        "존재하지않는학생",
        mockEditModalData,
        mockEnrollments,
        mockStudents
      );

      expect(result).toEqual([]);
    });
  });
});

// 모킹을 위한 mock 데이터
const mockEditModalData = {
  id: "session-1",
  startsAt: "09:00",
  endsAt: "10:00",
  weekday: 0,
  room: "A101",
  enrollmentIds: ["enrollment-1"],
};
