// src/lib/errors/__tests__/AppError.test.ts
import { describe, expect, it } from "vitest";
import { AppError } from "../AppError";
import { ErrorCodes } from "../codes";

describe("AppError", () => {
  it("기본 생성 — message는 messages.ko에서 조회", () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE);
    expect(err.message).toBe("이미 존재하는 학생 이름입니다.");
    expect(err.code).toBe("STUDENT_NAME_DUPLICATE");
    expect(err.statusHint).toBe(500); // 기본값
    expect(err.cause).toBeUndefined();
  });

  it("statusHint 지정", () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE, { statusHint: 409 });
    expect(err.statusHint).toBe(409);
  });

  it("cause 보존", () => {
    const original = new Error("Supabase connection error");
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, { cause: original, statusHint: 500 });
    expect(err.cause).toBe(original);
  });

  it("messageOverride 사용 시 messages.ko 조회 대신 override 사용", () => {
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, {
      messageOverride: "Custom override message",
    });
    expect(err.message).toBe("Custom override message");
  });

  it("instanceof AppError 확인", () => {
    const err = new AppError(ErrorCodes.INVITE_TOKEN_EXPIRED, { statusHint: 410 });
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("name이 AppError여야 한다", () => {
    const err = new AppError(ErrorCodes.VALIDATION_FAILED);
    expect(err.name).toBe("AppError");
  });

  it("미매핑 코드 string — fallback 메시지 사용", () => {
    const err = new AppError("FUTURE_UNKNOWN_CODE");
    expect(err.message).toBe("알 수 없는 오류가 발생했습니다.");
    expect(err.code).toBe("FUTURE_UNKNOWN_CODE");
  });
});
