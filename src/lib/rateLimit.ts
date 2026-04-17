/**
 * In-memory rate limiter (single-instance Lightsail 전제)
 *
 * 멀티 인스턴스 환경으로 확장 시 Redis/Upstash 백엔드로 교체 필요.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  // 윈도우 만료 시 새 엔트리
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, resetAt };
  }

  // 한도 초과
  if (entry.count >= limit) {
    return { allowed: false, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}
