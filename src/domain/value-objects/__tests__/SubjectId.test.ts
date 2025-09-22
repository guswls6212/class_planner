import { describe, expect, it } from "vitest";
import { SubjectId } from "../SubjectId";

describe("SubjectId Value Object", () => {
  it("유효한 UUID로 SubjectId를 생성해야 한다", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const subjectId = SubjectId.fromString(validUuid);

    expect(subjectId.value).toBe(validUuid);
  });

  it("유효하지 않은 UUID로 SubjectId 생성 시 에러를 던져야 한다", () => {
    const invalidUuid = "invalid-uuid";

    expect(() => SubjectId.fromString(invalidUuid)).toThrow(
      "SubjectId must be a valid UUID"
    );
  });

  it("빈 문자열로 SubjectId 생성 시 에러를 던져야 한다", () => {
    expect(() => SubjectId.fromString("")).toThrow("SubjectId cannot be empty");
  });

  it("랜덤 UUID로 SubjectId를 생성해야 한다", () => {
    const subjectId = SubjectId.generate();

    expect(subjectId.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("동일한 값의 SubjectId는 같아야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const subjectId1 = SubjectId.fromString(uuid);
    const subjectId2 = SubjectId.fromString(uuid);

    expect(subjectId1.equals(subjectId2)).toBe(true);
  });

  it("다른 값의 SubjectId는 달라야 한다", () => {
    const subjectId1 = SubjectId.generate();
    const subjectId2 = SubjectId.generate();

    expect(subjectId1.equals(subjectId2)).toBe(false);
  });

  it("toString 메서드가 올바른 값을 반환해야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const subjectId = SubjectId.fromString(uuid);

    expect(subjectId.toString()).toBe(uuid);
  });
});
