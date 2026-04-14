// src/lib/errors/__tests__/httpErrors.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { toErrorResponse } from "../httpErrors";
import { AppError } from "../AppError";
import { ErrorCodes } from "../codes";

vi.mock("../../logger", () => ({
  logger: { error: vi.fn() },
}));

describe("toErrorResponse", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AppError — 올바른 code, message, statusHint로 응답", async () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE, { statusHint: 409 });
    const res = toErrorResponse(err);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("STUDENT_NAME_DUPLICATE");
    expect(body.error.message).toBe("이미 존재하는 학생 이름입니다.");
    expect(body.error.details).toBeUndefined();
  });

  it("AppError — NODE_ENV=development에서 cause를 details에 포함", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const cause = new Error("DB connection failed");
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, { statusHint: 500, cause });
    const res = toErrorResponse(err);

    const body = await res.json();
    expect(body.error.details).toBeDefined();
    expect(body.error.details.cause.message).toBe("DB connection failed");
  });

  it("generic Error — INTERNAL_ERROR 500 반환", async () => {
    const err = new Error("Unexpected failure");
    const res = toErrorResponse(err);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("서버 오류가 발생했습니다.");
  });

  it("generic Error — production에서 details 미포함", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const err = new Error("secret internal error");
    const res = toErrorResponse(err);

    const body = await res.json();
    expect(body.error.details).toBeUndefined();
  });

  it("non-Error 값 (string) — INTERNAL_ERROR 500 반환", async () => {
    const res = toErrorResponse("something went wrong");

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
