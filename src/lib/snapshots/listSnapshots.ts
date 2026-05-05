import { logger } from "../logger";
import type { DataSnapshotMeta } from "./types";

/**
 * 설정 페이지 "데이터 이력" 섹션에서 호출. counts만 미리 계산해 받고,
 * 전체 dataPayload는 복원 시점까지 fetch 안 함 (대역폭 절약).
 */
export async function listSnapshots(
  userId: string,
  academyId: string,
): Promise<DataSnapshotMeta[]> {
  try {
    const res = await fetch(
      `/api/data-snapshots?userId=${encodeURIComponent(userId)}&academyId=${encodeURIComponent(academyId)}`,
    );
    if (!res.ok) {
      logger.warn("listSnapshots 실패", { status: res.status });
      return [];
    }
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (err) {
    logger.error("listSnapshots 예외", undefined, err as Error);
    return [];
  }
}
