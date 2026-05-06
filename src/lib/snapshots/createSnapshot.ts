import { logger } from "../logger";
import type { CreateSnapshotInput } from "./types";

/**
 * 백업 생성. before_conflict는 핵심 안전망이라 await 후 실패 처리 권장.
 * auto_template / manual은 fire-and-forget 가능 (실패해도 사용자 흐름 차단 X).
 *
 * Server side에서 retention 정책 atomic enforce (auto_template max 10/30일 등).
 */
export async function createSnapshot(
  userId: string,
  academyId: string,
  input: CreateSnapshotInput,
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    const res = await fetch(
      `/api/data-snapshots?userId=${encodeURIComponent(userId)}&academyId=${encodeURIComponent(academyId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: input.type,
          payload: input.payload,
          description: input.description ?? null,
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      logger.warn("createSnapshot 실패", { status: res.status, error: errText, type: input.type });
      return { success: false, error: errText };
    }
    const json = await res.json();
    return { success: !!json.success, snapshotId: json?.data?.id };
  } catch (err) {
    logger.error("createSnapshot 예외", { type: input.type }, err as Error);
    return { success: false, error: (err as Error).message };
  }
}
