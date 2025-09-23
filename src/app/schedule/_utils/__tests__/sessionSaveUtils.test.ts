import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Enrollment } from "../../../../lib/planner";
import type { TempEnrollment } from "../sessionSaveUtils";
import { processTempEnrollments } from "../sessionSaveUtils";

describe("sessionSaveUtils", () => {
  let mockAddEnrollment: ReturnType<typeof vi.fn>;
  let mockGetClassPlannerData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAddEnrollment = vi.fn();
    mockGetClassPlannerData = vi.fn();
  });

  describe("processTempEnrollments", () => {
    it("tempEnrollments가 비어있을 때 기존 enrollments를 그대로 반환해야 한다", async () => {
      const existingEnrollments: Enrollment[] = [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ];

      mockGetClassPlannerData.mockReturnValue({
        enrollments: existingEnrollments,
      });

      const result = await processTempEnrollments(
        [],
        mockAddEnrollment,
        mockGetClassPlannerData
      );

      expect(result.allEnrollments).toEqual(existingEnrollments);
      expect(result.currentEnrollmentIds).toEqual([]);
      expect(mockAddEnrollment).not.toHaveBeenCalled();
    });

    it("tempEnrollments가 있을 때 올바르게 처리되어야 한다", async () => {
      const tempEnrollments: TempEnrollment[] = [
        { id: "temp-1", studentId: "student-2", subjectId: "subject-1" },
        { id: "temp-2", studentId: "student-3", subjectId: "subject-1" },
      ];

      const existingEnrollments: Enrollment[] = [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ];

      const newEnrollments: Enrollment[] = [
        {
          id: "new-enrollment-1",
          studentId: "student-2",
          subjectId: "subject-1",
        },
        {
          id: "new-enrollment-2",
          studentId: "student-3",
          subjectId: "subject-1",
        },
      ];

      mockAddEnrollment.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      mockGetClassPlannerData.mockReturnValue({
        enrollments: [...existingEnrollments, ...newEnrollments],
      });

      const result = await processTempEnrollments(
        tempEnrollments,
        mockAddEnrollment,
        mockGetClassPlannerData
      );

      expect(mockAddEnrollment).toHaveBeenCalledTimes(2);
      expect(mockAddEnrollment).toHaveBeenCalledWith("student-2", "subject-1");
      expect(mockAddEnrollment).toHaveBeenCalledWith("student-3", "subject-1");

      expect(result.allEnrollments).toEqual([
        ...existingEnrollments,
        ...newEnrollments,
      ]);
      expect(result.currentEnrollmentIds).toEqual([
        "new-enrollment-1",
        "new-enrollment-2",
      ]);
    });

    it("addEnrollment이 실패해도 계속 진행되어야 한다", async () => {
      const tempEnrollments: TempEnrollment[] = [
        { id: "temp-1", studentId: "student-2", subjectId: "subject-1" },
        { id: "temp-2", studentId: "student-3", subjectId: "subject-1" },
      ];

      const existingEnrollments: Enrollment[] = [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ];

      const newEnrollments: Enrollment[] = [
        {
          id: "new-enrollment-2",
          studentId: "student-3",
          subjectId: "subject-1",
        },
      ];

      mockAddEnrollment
        .mockResolvedValueOnce(false) // 첫 번째 실패
        .mockResolvedValueOnce(true); // 두 번째 성공

      mockGetClassPlannerData.mockReturnValue({
        enrollments: [...existingEnrollments, ...newEnrollments],
      });

      const result = await processTempEnrollments(
        tempEnrollments,
        mockAddEnrollment,
        mockGetClassPlannerData
      );

      expect(mockAddEnrollment).toHaveBeenCalledTimes(2);
      expect(result.allEnrollments).toEqual([
        ...existingEnrollments,
        ...newEnrollments,
      ]);
      expect(result.currentEnrollmentIds).toEqual(["new-enrollment-2"]);
    });

    it("TempEnrollment에 id가 포함되어 있어야 한다 - 핵심 테스트", () => {
      const tempEnrollments: TempEnrollment[] = [
        { id: "temp-1", studentId: "student-2", subjectId: "subject-1" },
      ];

      // TypeScript 컴파일 타임에 id 필드가 있는지 확인
      expect(tempEnrollments[0].id).toBe("temp-1");
      expect(tempEnrollments[0].studentId).toBe("student-2");
      expect(tempEnrollments[0].subjectId).toBe("subject-1");
    });

    it("모든 tempEnrollments가 실패해도 빈 배열을 반환해야 한다", async () => {
      const tempEnrollments: TempEnrollment[] = [
        { id: "temp-1", studentId: "student-2", subjectId: "subject-1" },
        { id: "temp-2", studentId: "student-3", subjectId: "subject-1" },
      ];

      const existingEnrollments: Enrollment[] = [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ];

      mockAddEnrollment
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      mockGetClassPlannerData
        .mockReturnValueOnce({ enrollments: existingEnrollments })
        .mockReturnValueOnce({ enrollments: existingEnrollments });

      const result = await processTempEnrollments(
        tempEnrollments,
        mockAddEnrollment,
        mockGetClassPlannerData
      );

      expect(mockAddEnrollment).toHaveBeenCalledTimes(2);
      expect(result.allEnrollments).toEqual(existingEnrollments);
      expect(result.currentEnrollmentIds).toEqual([]);
    });
  });
});
