/**
 * @deprecated S3 완료. 이 모듈은 레거시 JSONB bulk sync 전용이다.
 * 클라이언트는 이제 apiSync.ts의 per-entity fire-and-forget 방식을 사용한다.
 * S5에서 이 파일을 제거한다.
 *
 * 하위 호환성을 위해 export는 유지하되 모두 no-op으로 전환.
 */

import type { ClassPlannerData } from "./localStorageCrud";

// ===== @deprecated no-op exports =====

/** @deprecated apiSync.ts의 syncXxx 함수를 사용하세요 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const scheduleServerSync = (_data: ClassPlannerData): void => {
  // no-op: S3에서 per-entity fire-and-forget으로 교체됨
};

/** @deprecated S5에서 제거 예정 */
export const forceSyncToServer = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: ClassPlannerData
): Promise<{ success: boolean; error?: string; syncedAt?: string }> => {
  return { success: true };
};

/** @deprecated S5에서 제거 예정 */
export const initializeSyncSystem = (): void => {
  // no-op
};

/** @deprecated S5에서 제거 예정 */
export const cleanupSyncSystem = (): void => {
  // no-op
};

/** @deprecated S5에서 제거 예정 */
export const getSyncStatus = () => ({
  isActive: false,
  queueLength: 0,
  isSyncing: false,
  lastSyncTime: null,
  firstChangeTime: null,
  nextSyncIn: null,
  maxDelay: 0,
});
