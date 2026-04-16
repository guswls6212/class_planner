// src/lib/errors/__tests__/codes.test.ts
import { describe, expect, it } from "vitest";
import { ErrorCodes, type ErrorCode } from "../codes";

describe("ErrorCodes", () => {
  it("각 코드의 키와 값이 동일해야 한다", () => {
    for (const [key, value] of Object.entries(ErrorCodes)) {
      expect(key).toBe(value);
    }
  });

  it("STUDENT_NAME_DUPLICATE 코드가 존재해야 한다", () => {
    expect(ErrorCodes.STUDENT_NAME_DUPLICATE).toBe("STUDENT_NAME_DUPLICATE");
  });

  it("STUDENT_PHONE_INVALID_FORMAT 코드가 존재해야 한다", () => {
    expect(ErrorCodes.STUDENT_PHONE_INVALID_FORMAT).toBe("STUDENT_PHONE_INVALID_FORMAT");
  });

  it("INVITE_TOKEN_EXPIRED 코드가 존재해야 한다", () => {
    expect(ErrorCodes.INVITE_TOKEN_EXPIRED).toBe("INVITE_TOKEN_EXPIRED");
  });

  it("INTERNAL_ERROR 코드가 존재해야 한다", () => {
    expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });

  it("ErrorCode 타입이 union string literal이어야 한다", () => {
    const code: ErrorCode = "STUDENT_NAME_DUPLICATE";
    expect(typeof code).toBe("string");
  });

  it("에러 코드 개수가 정확해야 한다", () => {
    expect(Object.keys(ErrorCodes).length).toBe(18);
  });
});
