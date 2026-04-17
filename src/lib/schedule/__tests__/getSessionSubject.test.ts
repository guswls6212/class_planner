import { describe, expect, it } from "vitest";
import { getSessionSubject } from "../getSessionSubject";

describe("getSessionSubject", () => {
  const subjects = [
    { id: "s1", name: "수학", color: "#3b82f6" },
    { id: "s2", name: "영어", color: "#ef4444" },
  ] as any[];
  const enrollments = [
    { id: "e1", subjectId: "s1", studentId: "st1" },
    { id: "e2", subjectId: "s2", studentId: "st2" },
  ] as any[];

  it("첫 enrollment의 subject를 반환", () => {
    const result = getSessionSubject({ enrollmentIds: ["e1"] } as any, enrollments, subjects);
    expect(result?.name).toBe("수학");
  });

  it("enrollmentIds 빈 배열이면 null", () => {
    expect(getSessionSubject({ enrollmentIds: [] } as any, enrollments, subjects)).toBeNull();
  });

  it("enrollment 못 찾으면 null", () => {
    expect(getSessionSubject({ enrollmentIds: ["x"] } as any, enrollments, subjects)).toBeNull();
  });
});
