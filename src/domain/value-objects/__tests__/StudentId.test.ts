import { describe, expect, it } from "vitest";
import { StudentId } from "../StudentId";

describe("StudentId Value Object", () => {
  it("유효한 UUID로 StudentId를 생성해야 한다", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const studentId = StudentId.fromString(validUuid);

    expect(studentId.value).toBe(validUuid);
  });

  it("유효하지 않은 UUID로 StudentId 생성 시 에러를 던져야 한다", () => {
    const invalidUuid = "invalid-uuid";

    expect(() => StudentId.fromString(invalidUuid)).toThrow(
      "StudentId must be a valid UUID"
    );
  });

  it("빈 문자열로 StudentId 생성 시 에러를 던져야 한다", () => {
    expect(() => StudentId.fromString("")).toThrow("StudentId cannot be empty");
  });

  it("랜덤 UUID로 StudentId를 생성해야 한다", () => {
    const studentId = StudentId.generate();

    expect(studentId.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("동일한 값의 StudentId는 같아야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const studentId1 = StudentId.fromString(uuid);
    const studentId2 = StudentId.fromString(uuid);

    expect(studentId1.equals(studentId2)).toBe(true);
  });

  it("다른 값의 StudentId는 달라야 한다", () => {
    const studentId1 = StudentId.generate();
    const studentId2 = StudentId.generate();

    expect(studentId1.equals(studentId2)).toBe(false);
  });

  it("toString 메서드가 올바른 값을 반환해야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const studentId = StudentId.fromString(uuid);

    expect(studentId.toString()).toBe(uuid);
  });
});
