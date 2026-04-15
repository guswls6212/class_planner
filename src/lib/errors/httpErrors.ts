// src/lib/errors/httpErrors.ts
import { NextResponse } from "next/server";
import { AppError } from "./AppError";
import { ErrorCodes } from "./codes";
import { getKoMessage } from "./messages.ko";
import { logger } from "../logger";

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 에러를 통일된 NextResponse로 직렬화한다.
 * - AppError: code, statusHint, message 사용
 * - 그 외: INTERNAL_ERROR 500 반환 (원본 에러는 로그에만 기록)
 * - details: NODE_ENV === 'development'에서만 포함
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    // 5xx AppErrors should still be logged (unexpected domain errors)
    if (error.statusHint >= 500) {
      logger.error("AppError with 5xx status", undefined, error);
    }

    const body: ErrorBody = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (process.env.NODE_ENV === "development" && error.cause != null) {
      body.error.details = {
        cause:
          error.cause instanceof Error
            ? { name: error.cause.name, message: error.cause.message }
            : String(error.cause),
      };
    }

    return NextResponse.json(body, { status: error.statusHint });
  }

  // 알 수 없는 에러 — 원본을 클라이언트에 노출하지 않음
  const asError = error instanceof Error ? error : new Error(String(error));
  logger.error("Unexpected error in API route", undefined, asError);

  const body: ErrorBody = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: getKoMessage(ErrorCodes.INTERNAL_ERROR),
    },
  };

  if (process.env.NODE_ENV === "development") {
    body.error.details = {
      cause:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    };
  }

  return NextResponse.json(body, { status: 500 });
}
