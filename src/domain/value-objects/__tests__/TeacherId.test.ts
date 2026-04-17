import { describe, expect, it } from "vitest";
import { TeacherId } from "../TeacherId";

describe("TeacherId Value Object", () => {
  it("유효한 UUID로 TeacherId를 생성해야 한다", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const teacherId = TeacherId.fromString(validUuid);
    expect(teacherId.value).toBe(validUuid);
  });

  it("유효하지 않은 UUID로 TeacherId 생성 시 에러를 던져야 한다", () => {
    expect(() => TeacherId.fromString("invalid-uuid")).toThrow(
      "TeacherId must be a valid UUID"
    );
  });

  it("빈 문자열로 TeacherId 생성 시 에러를 던져야 한다", () => {
    expect(() => TeacherId.fromString("")).toThrow("TeacherId cannot be empty");
  });

  it("generate 메서드로 유효한 UUID를 생성해야 한다", () => {
    const teacherId = TeacherId.generate();
    expect(teacherId.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("동일한 값의 TeacherId는 같아야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const id1 = TeacherId.fromString(uuid);
    const id2 = TeacherId.fromString(uuid);
    expect(id1.equals(id2)).toBe(true);
  });

  it("다른 값의 TeacherId는 달라야 한다", () => {
    const id1 = TeacherId.generate();
    const id2 = TeacherId.generate();
    expect(id1.equals(id2)).toBe(false);
  });

  it("toString 메서드가 올바른 값을 반환해야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const teacherId = TeacherId.fromString(uuid);
    expect(teacherId.toString()).toBe(uuid);
  });

  it("toJSON 메서드가 문자열을 반환해야 한다", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const teacherId = TeacherId.fromString(uuid);
    expect(teacherId.toJSON()).toBe(uuid);
  });
});
