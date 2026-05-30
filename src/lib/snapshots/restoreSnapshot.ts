import { setClassPlannerData } from "../localStorageCrud";
import type { ClassPlannerData } from "../localStorageCrud";
import { logger } from "../logger";
import { createSnapshot } from "./createSnapshot";

/**
 * Chain of safety — 복원 직전 현재 상태를 before_conflict 스냅샷으로 백업
 * 후 덮어쓰기. 사용자가 복원 후 "원래대로" 원할 시 그 chain 백업으로 다시
 * 복원 가능. before_conflict는 retention 무제한이라 freemium 정책에 안 걸림.
 */
export async function restoreSnapshot(
  userId: string,
  academyId: string,
  snapshotId: string,
  currentData: ClassPlannerData,
): Promise<{ success: boolean; error?: string }> {
  // 1. Chain of safety — 현재 상태 before_conflict로 보존
  const chainResult = await createSnapshot(userId, academyId, {
    type: "before_conflict",
    payload: currentData,
    description: `복원 직전 자동 백업 (snapshot ${snapshotId.slice(0, 8)}로 복원 직전)`,
  });
  if (!chainResult.success) {
    logger.warn("Chain of safety 백업 실패 — 복원 중단 (안전 우선)", {
      snapshotId,
      error: chainResult.error,
    });
    return { success: false, error: "복원 직전 안전 백업 생성 실패. 다시 시도해 주세요." };
  }

  // 2. 서버에 복원 요청 — 응답으로 dataPayload 받음
  try {
    const res = await fetch(
      `/api/data-snapshots/${encodeURIComponent(snapshotId)}/restore?userId=${encodeURIComponent(userId)}&academyId=${encodeURIComponent(academyId)}`,
      { method: "POST" },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "복원 요청 실패");
      return { success: false, error: errText };
    }
    const json = await res.json();
    const payload = json?.data?.dataPayload;
    if (!payload) {
      return { success: false, error: "복원할 데이터를 찾을 수 없습니다." };
    }

    // 3. localStorage에 적용 — before_conflict 백업은 { local, server } 형태이므로
    //    그 경우 사용자가 별도 분기로 처리 (현재 RestoreSnapshot은 단일 ClassPlannerData만 지원).
    if ("local" in payload || "server" in payload) {
      return {
        success: false,
        error: "충돌 직전 백업은 양쪽 데이터를 가진 형식이라 단순 복원 불가 — 향후 별도 UI로 분기 복원 지원 예정.",
      };
    }
    setClassPlannerData(payload as ClassPlannerData);
    return { success: true };
  } catch (err) {
    logger.error("restoreSnapshot 예외", { snapshotId }, err as Error);
    return { success: false, error: (err as Error).message };
  }
}
