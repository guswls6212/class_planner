/**
 * Pending Deletes — deferred-commit + undo 패턴의 race fix.
 *
 * deleteStudent는 5초 지연 commit + undo 토스트 (PR γ). 그 5초 안에
 * 새로고침하면 server는 아직 entity 보유 → init fetch 시 부활. 본 모듈은
 * 학생 삭제가 시작된 시점에 localStorage에 {id, deadline} 페어를 영속화하여
 * (1) 새로고침/탭 재진입 시 init fetch 결과에서 해당 id를 필터링하고
 * (2) 만료 entry는 즉시 server commit, 활성 entry는 남은 시간 동안 timer 재등록.
 */

import { getStorageKey } from "./localStorageCrud";
import { logger } from "./logger";

export const PENDING_DELETE_TTL_MS = 5_000;

export type PendingDeleteEntityType = "student";

export interface PendingDelete {
  entityType: PendingDeleteEntityType;
  id: string;
  deadline: number;
}

function getPendingDeletesStorageKey(academyId?: string): string {
  return `${getStorageKey(academyId)}:pendingDeletes`;
}

export function getPendingDeletes(academyId?: string): PendingDelete[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getPendingDeletesStorageKey(academyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PendingDelete =>
        p &&
        typeof p === "object" &&
        typeof p.entityType === "string" &&
        typeof p.id === "string" &&
        typeof p.deadline === "number",
    );
  } catch (err) {
    logger.warn("pendingDeletes - read 실패", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

function writePendingDeletes(
  list: PendingDelete[],
  academyId?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getPendingDeletesStorageKey(academyId),
      JSON.stringify(list),
    );
  } catch (err) {
    logger.error(
      "pendingDeletes - write 실패",
      undefined,
      err as Error,
    );
  }
}

export function addPendingDelete(
  entry: PendingDelete,
  academyId?: string,
): void {
  const current = getPendingDeletes(academyId);
  const filtered = current.filter(
    (p) => !(p.entityType === entry.entityType && p.id === entry.id),
  );
  filtered.push(entry);
  writePendingDeletes(filtered, academyId);
}

export function removePendingDelete(
  entityType: PendingDeleteEntityType,
  id: string,
  academyId?: string,
): void {
  const current = getPendingDeletes(academyId);
  const filtered = current.filter(
    (p) => !(p.entityType === entityType && p.id === id),
  );
  if (filtered.length === current.length) return;
  writePendingDeletes(filtered, academyId);
}

export function isPendingDelete(
  entityType: PendingDeleteEntityType,
  id: string,
  academyId?: string,
): boolean {
  return getPendingDeletes(academyId).some(
    (p) => p.entityType === entityType && p.id === id,
  );
}

export function getActivePendingDeletes(
  now: number = Date.now(),
  academyId?: string,
): PendingDelete[] {
  return getPendingDeletes(academyId).filter((p) => p.deadline > now);
}

export function getExpiredPendingDeletes(
  now: number = Date.now(),
  academyId?: string,
): PendingDelete[] {
  return getPendingDeletes(academyId).filter((p) => p.deadline <= now);
}

export function getPendingDeleteIds(
  entityType: PendingDeleteEntityType,
  academyId?: string,
): Set<string> {
  return new Set(
    getPendingDeletes(academyId)
      .filter((p) => p.entityType === entityType)
      .map((p) => p.id),
  );
}
