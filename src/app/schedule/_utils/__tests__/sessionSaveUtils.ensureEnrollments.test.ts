import { describe, it, expect, vi } from "vitest";
import { ensureEnrollmentIdsForSubject } from "../sessionSaveUtils";

describe("ensureEnrollmentIdsForSubject", () => {
  it("creates missing enrollments for target subject and returns ids", async () => {
    const subjectId = "sub-1";
    const studentIds = ["s1", "s2"]; 
    const enrollments = [
      { id: "e-existing", studentId: "s1", subjectId: "sub-1" },
      { id: "e-other", studentId: "s2", subjectId: "sub-2" },
    ];

    const addEnrollment = vi.fn(async (studentId: string, subjId: string) => {
      enrollments.push({ id: `e-${studentId}-${subjId}`, studentId, subjectId: subjId });
      return true;
    });

    const getClassPlannerData = () => ({ enrollments });

    const { enrollmentIds, allEnrollments } = await ensureEnrollmentIdsForSubject(
      studentIds,
      subjectId,
      addEnrollment,
      getClassPlannerData,
      enrollments
    );

    expect(addEnrollment).toHaveBeenCalledTimes(1);
    expect(addEnrollment).toHaveBeenCalledWith("s2", "sub-1");
    expect(enrollmentIds).toEqual(["e-existing", "e-s2-sub-1"]);
    expect(allEnrollments.find((e) => e.id === "e-s2-sub-1")).toBeTruthy();
  });
});


