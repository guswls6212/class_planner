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
 * cause를 클라이언트 표시용으로 직렬화한다.
 * - Error 인스턴스: name + message
 * - Supabase PostgrestError 등 일반 객체: code/message/details/hint 핵심 필드만 추출
 *   ("[object Object]" 직렬화 사고 방지 — UAT 2026-05-10)
 * - 그 외 원시값: String(value)
 */
function serializeCause(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const picked: Record<string, unknown> = {};
    for (const key of ["code", "message", "details", "hint"]) {
      const v = obj[key];
      if (typeof v === "string" && v.length > 0) picked[key] = v;
    }
    if (Object.keys(picked).length > 0) return picked;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return String(value);
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
      body.error.details = { cause: serializeCause(error.cause) };
    }

    return NextResponse.json(body, { status: error.statusHint });
  }

  // 알 수 없는 에러 — 원본을 클라이언트에 노출하지 않음
  // Supabase PostgrestError 등 비-Error 객체도 message 필드는 살려서 로깅한다.
  const errMessage =
    error instanceof Error
      ? error.message
      : (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string"
          ? ((error as Record<string, unknown>).message as string)
          : String(error));
  const asError = error instanceof Error ? error : new Error(errMessage);
  logger.error("Unexpected error in API route", undefined, asError);

  const body: ErrorBody = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: getKoMessage(ErrorCodes.INTERNAL_ERROR),
    },
  };

  if (process.env.NODE_ENV === "development") {
    body.error.details = { cause: serializeCause(error) };
  }

  return NextResponse.json(body, { status: 500 });
}
