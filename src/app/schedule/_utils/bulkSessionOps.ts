/**
 * 다중 선택된 sessions에 대한 일괄 작업 유틸리티.
 *
 * 충돌 정책 — 옵션 B (recommended):
 *   충돌 없는 항목만 진행, 충돌 항목은 결과 객체에 분리해 호출자가 토스트로 안내
 *
 * Server sync는 호출자가 책임 (이 유틸은 localStorage SSOT만 다룸).
 */

import type { Session } from "@/lib/planner";
import {
  getClassPlannerData,
  setClassPlannerData,
} from "@/lib/localStorageCrud";
import { logger } from "@/lib/logger";

export interface BulkDeleteResult {
  /** 삭제된 세션 (undo 시 복원용 — 원본 그대로 보관) */
  deleted: Session[];
  /** 찾을 수 없어 건너뛴 id */
  notFound: string[];
}

/**
 * 다중 sessions를 localStorage에서 한꺼번에 제거.
 * 호출자는 결과의 deleted를 5~7s 동안 보관해 undo 시 복원 가능.
 */
export function bulkDeleteSessionsFromLocal(
  ids: string[],
): BulkDeleteResult {
  const data = getClassPlannerData();
  const idSet = new Set(ids);
  const deleted: Session[] = [];
  const notFound: string[] = [];

  for (const id of ids) {
    const found = data.sessions.find((s) => s.id === id);
    if (found) deleted.push(found);
    else notFound.push(id);
  }

  data.sessions = data.sessions.filter((s) => !idSet.has(s.id));
  data.lastModified = new Date().toISOString();
  setClassPlannerData(data);

  logger.info("bulkDeleteSessionsFromLocal", {
    requested: ids.length,
    deleted: deleted.length,
    notFound: notFound.length,
  });

  return { deleted, notFound };
}

/**
 * undo — bulkDeleteSessionsFromLocal로 제거한 sessions 복원.
 * 이미 같은 id가 있으면 건너뜀 (서버 sync race 방지).
 */
export function restoreBulkDeletedSessions(deleted: Session[]): void {
  if (deleted.length === 0) return;
  const data = getClassPlannerData();
  const existingIds = new Set(data.sessions.map((s) => s.id));
  for (const s of deleted) {
    if (!existingIds.has(s.id)) data.sessions.push(s);
  }
  data.lastModified = new Date().toISOString();
  setClassPlannerData(data);
  logger.info("restoreBulkDeletedSessions", { restored: deleted.length });
}
