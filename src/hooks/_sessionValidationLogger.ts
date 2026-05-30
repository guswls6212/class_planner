import { logger } from "../lib/logger";

type Reason =
  | "missing-fields"
  | "missing-enrollment-ids"
  | "no-valid-enrollment";

const MESSAGE: Record<Reason, string> = {
  "missing-fields": "불완전한 세션 필터링됨 (필수 속성 누락)",
  "missing-enrollment-ids": "불완전한 세션 필터링됨 (enrollmentIds 누락)",
  "no-valid-enrollment": "불완전한 세션 필터링됨 (유효한 enrollment 없음)",
};

const seen = new Set<string>();

// dangling session WARN이 한 페이지 lifecycle에서 같은 sessionId × 같은 reason으로
// 반복 호출되어 /api/logs/client rate limit(30/min)을 즉시 돌파하던 사고를
// 막기 위함. 모듈 단일 Set으로 useDisplaySessions와 useTeacherDisplaySessions가
// 같은 sessionId에 대해 한 번만 로깅한다.
export function warnInvalidSession(
  reason: Reason,
  context: { sessionId?: string; [key: string]: unknown }
): void {
  const sessionId = context.sessionId ?? "unknown";
  const key = `${sessionId}|${reason}`;
  if (seen.has(key)) return;
  seen.add(key);
  logger.warn(MESSAGE[reason], context);
}

export function _resetSessionValidationLoggerCache(): void {
  seen.clear();
}
