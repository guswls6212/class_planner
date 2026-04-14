// src/lib/errors/AppError.ts
import type { ErrorCode } from "./codes";
import { getKoMessage } from "./messages.ko";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusHint: number;
  public readonly cause?: unknown;

  constructor(
    code: ErrorCode | string,
    options: {
      statusHint?: number;
      cause?: unknown;
      /** 메시지를 messages.ko 조회 대신 직접 지정할 때 사용 (테스트/특수 케이스만) */
      messageOverride?: string;
    } = {}
  ) {
    const message = options.messageOverride ?? getKoMessage(code);
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusHint = options.statusHint ?? 500;
    this.cause = options.cause;
  }
}
