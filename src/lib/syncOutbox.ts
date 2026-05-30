/**
 * Sync outbox — fireAndForget이 10회 retry 후 포기한 작업을 localStorage에
 * 영구 보관. 다음 페이지 진입 시 자동 flush로 재시도 → 오프라인/장기 장애로
 * 인한 데이터 손실 방지.
 *
 * 보관 위치: localStorage["class_planner_${userId}_sync_outbox"]
 * 보관 기간: 24시간 (그 이상은 stale로 간주, flush 시 제거 + 알림)
 * 최대 항목: 100개 (FIFO — 오래된 것부터 drop)
 */

import { logger } from "./logger";

const MAX_ENTRIES = 100;
const TTL_MS = 24 * 60 * 60 * 1000;

export interface OutboxEntry {
  /** 클라이언트가 부여하는 unique id (재진입 시 dedup용) */
  id: string;
  /** sync 컨텍스트 라벨 (예: "session:create"). 디버깅용. */
  context: string;
  /** HTTP method */
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  /** 절대/상대 URL (userId 쿼리 포함된 형태 그대로 보관) */
  url: string;
  /** request body (POST/PUT/PATCH일 때) */
  body?: unknown;
  /** outbox에 처음 적재된 ISO 시각 */
  queuedAt: string;
  /** 마지막 flush 실패 메시지 (디버깅용, 선택) */
  lastError?: string;
}

function storageKey(userId: string): string {
  return `class_planner_${userId}_sync_outbox`;
}

function readOutbox(userId: string): OutboxEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeOutbox(userId: string, entries: OutboxEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch (err) {
    // QuotaExceededError 등은 silent — outbox는 best-effort
    logger.error("syncOutbox 저장 실패", { userId }, err as Error);
  }
}

/** outbox에 한 항목 추가. 100개 초과 시 가장 오래된 항목 drop. */
export function enqueueOutbox(
  userId: string,
  entry: Omit<OutboxEntry, "queuedAt"> & { queuedAt?: string },
): void {
  if (!userId) return;
  const list = readOutbox(userId);
  // 같은 id가 이미 있으면 update (dedup)
  const filtered = list.filter((e) => e.id !== entry.id);
  filtered.push({
    ...entry,
    queuedAt: entry.queuedAt ?? new Date().toISOString(),
  });
  // FIFO drop
  while (filtered.length > MAX_ENTRIES) filtered.shift();
  writeOutbox(userId, filtered);
}

export function getOutboxSize(userId: string | null): number {
  if (!userId) return 0;
  return readOutbox(userId).length;
}

/**
 * outbox 전체 항목 읽기 (UI 표시용 — SyncQueueModal에서 사용).
 * read-only 사본 반환.
 */
export function getOutboxEntries(userId: string | null): OutboxEntry[] {
  if (!userId) return [];
  return readOutbox(userId);
}

/** 특정 entry 제거 (사용자가 [버리기] 클릭 시). */
export function removeOutboxEntry(userId: string, entryId: string): void {
  if (typeof window === "undefined") return;
  const list = readOutbox(userId);
  const filtered = list.filter((e) => e.id !== entryId);
  if (filtered.length !== list.length) {
    writeOutbox(userId, filtered);
  }
}

/**
 * 특정 entry 1건만 즉시 재시도. 성공 시 outbox에서 제거 + 반환 true.
 * 실패 시 lastError 갱신해 보관 + 반환 false.
 */
export async function flushOutboxEntry(
  userId: string,
  entryId: string,
): Promise<boolean> {
  if (!userId || typeof window === "undefined") return false;
  const list = readOutbox(userId);
  const target = list.find((e) => e.id === entryId);
  if (!target) return false;

  try {
    const res = await fetch(target.url, {
      method: target.method,
      headers: target.body
        ? { "Content-Type": "application/json" }
        : undefined,
      body:
        target.body !== undefined ? JSON.stringify(target.body) : undefined,
    });
    if (res.ok) {
      writeOutbox(userId, list.filter((e) => e.id !== entryId));
      return true;
    }
    // 4xx → drop (retry 무의미)
    if (res.status >= 400 && res.status < 500) {
      writeOutbox(userId, list.filter((e) => e.id !== entryId));
      logger.error("flushOutboxEntry 4xx (drop)", {
        context: target.context,
        status: res.status,
      });
      return false;
    }
    // 5xx → 보관, lastError 갱신
    writeOutbox(
      userId,
      list.map((e) =>
        e.id === entryId ? { ...e, lastError: `HTTP ${res.status}` } : e,
      ),
    );
    return false;
  } catch (err) {
    writeOutbox(
      userId,
      list.map((e) =>
        e.id === entryId
          ? {
              ...e,
              lastError: err instanceof Error ? err.message : "network",
            }
          : e,
      ),
    );
    return false;
  }
}

export function clearOutbox(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId));
}

/**
 * outbox 전체 항목을 순차로 fetch 재시도. 성공한 항목은 제거.
 * 24시간 초과 항목은 expired로 분류해 제거 (개수 반환).
 *
 * @returns { sent, failed, expired }
 */
type FlushResult = { sent: number; failed: number; expired: number };

// userId 별 in-flight flush 가드 — mount 자동 flush + 수동 [모두 재시도] 가 동시에
// 호출돼도 같은 promise 를 공유 → 중복 POST / 두 flush 의 writeOutbox 상호 clobber 차단.
const flushInFlight = new Map<string, Promise<FlushResult>>();

export async function flushOutbox(userId: string): Promise<FlushResult> {
  if (!userId || typeof window === "undefined") {
    return { sent: 0, failed: 0, expired: 0 };
  }

  const existing = flushInFlight.get(userId);
  if (existing) return existing;

  const run = doFlush(userId);
  flushInFlight.set(userId, run);
  try {
    return await run;
  } finally {
    flushInFlight.delete(userId);
  }
}

async function doFlush(userId: string): Promise<FlushResult> {
  const initial = readOutbox(userId);
  if (initial.length === 0) return { sent: 0, failed: 0, expired: 0 };

  const now = Date.now();
  const fresh: OutboxEntry[] = [];
  const expired: OutboxEntry[] = [];
  for (const e of initial) {
    if (now - new Date(e.queuedAt).getTime() > TTL_MS) {
      expired.push(e);
    } else {
      fresh.push(e);
    }
  }

  const remaining: OutboxEntry[] = [];
  let sent = 0;
  let failed = 0;
  for (const entry of fresh) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: entry.body
          ? { "Content-Type": "application/json" }
          : undefined,
        body: entry.body !== undefined ? JSON.stringify(entry.body) : undefined,
      });
      if (res.ok) {
        sent++;
      } else {
        // 4xx (bad request / forbidden 등) — retry 무의미 → drop
        if (res.status >= 400 && res.status < 500) {
          logger.error("outbox flush 4xx 실패 (drop)", {
            context: entry.context,
            status: res.status,
          });
          failed++;
        } else {
          // 5xx → 다음 flush까지 보관
          remaining.push({ ...entry, lastError: `HTTP ${res.status}` });
        }
      }
    } catch (err) {
      // 네트워크 오류 → 다음 flush까지 보관
      remaining.push({
        ...entry,
        lastError: err instanceof Error ? err.message : "network",
      });
    }
  }

  writeOutbox(userId, remaining);
  return { sent, failed, expired: expired.length };
}
