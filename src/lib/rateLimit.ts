/**
 * In-memory rate limiter (single-instance Lightsail 전제)
 *
 * 멀티 인스턴스 환경으로 확장 시 Redis/Upstash 백엔드로 교체 필요.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface LockoutEntry {
  failures: number;
  lockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();
const lockoutStore = new Map<string, LockoutEntry>();

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

/** 해당 key가 현재 잠금 상태인지 확인 */
export function checkLockout(key: string): boolean {
  const entry = lockoutStore.get(key);
  if (!entry || entry.lockedUntil === null) return false;
  if (Date.now() >= entry.lockedUntil) {
    // 잠금 만료 — 엔트리 초기화
    lockoutStore.delete(key);
    return false;
  }
  return true;
}

/** 실패를 기록하고, maxFailures 초과 시 lockoutMs 동안 잠금 */
export function recordFailure(
  key: string,
  maxFailures: number,
  lockoutMs: number
): void {
  const entry = lockoutStore.get(key) ?? { failures: 0, lockedUntil: null };
  entry.failures += 1;
  if (entry.failures >= maxFailures) {
    entry.lockedUntil = Date.now() + lockoutMs;
  }
  lockoutStore.set(key, entry);
}

/** 성공 시 해당 key의 실패 카운트 초기화 */
export function resetFailures(key: string): void {
  lockoutStore.delete(key);
}
