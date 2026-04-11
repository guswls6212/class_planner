/**
 * 🔄 Debounced 서버 동기화 시스템
 *
 * localStorage의 classPlannerData 변경사항을 30초 debounce로 서버와 동기화합니다.
 * 최대 5분 안전장치로 무한 연기 방지.
 * 사용자 경험을 방해하지 않으면서 데이터 일관성을 보장합니다.
 */

import type { ClassPlannerData } from "./localStorageCrud";
import { getAccessToken } from "./authUtils";
import { logger } from "./logger";
// KST time utils import removed

// ===== 타입 정의 =====

interface SyncQueueItem {
  data: ClassPlannerData;
  timestamp: string;
  retryCount: number;
}

interface SyncResult {
  success: boolean;
  error?: string;
  syncedAt?: string;
}

// ===== 상수 =====

const SYNC_INTERVAL = 30 * 1000; // 30초 (debounce)
const MAX_DELAY = 5 * 60 * 1000; // 최대 5분 후 강제 동기화
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5초

// ===== 전역 상태 =====

let syncTimer: NodeJS.Timeout | null = null;
let syncQueue: SyncQueueItem[] = [];
let isSyncing = false;
let lastSyncTime: string | null = null;
let firstChangeTime: string | null = null; // 🆕 첫 번째 변경 시간 (안전장치용)

// ===== 핵심 동기화 함수 =====

/**
 * 서버와 데이터 동기화
 */
const syncToServer = async (data: ClassPlannerData): Promise<SyncResult> => {
  try {
    // 사용자 ID 확인
    const userId = localStorage.getItem("supabase_user_id");
    if (!userId) {
      throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
    }

    // 인증 토큰 확인
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
    }

    logger.debug("debouncedServerSync - 서버 동기화 시작", {
      userId,
      studentCount: data.students.length,
      subjectCount: data.subjects.length,
      sessionCount: data.sessions.length,
      enrollmentCount: data.enrollments.length,
    });

    // 서버에 데이터 전송
    const response = await globalThis.fetch(`/api/data?userId=${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok || !responseData.success) {
      throw new Error(responseData.error || `HTTP ${response.status}`);
    }

    const syncedAt = new Date().toISOString();
    lastSyncTime = syncedAt;

    logger.info("debouncedServerSync - 서버 동기화 성공", {
      userId,
      syncedAt,
      dataSize: JSON.stringify(data).length,
    });

    return {
      success: true,
      syncedAt,
    };
  } catch (error) {
    logger.error(
      "debouncedServerSync - 서버 동기화 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 동기화 실패",
    };
  }
};

/**
 * 동기화 큐 처리
 */
const processSyncQueue = async (): Promise<void> => {
  if (isSyncing || syncQueue.length === 0) {
    return;
  }

  isSyncing = true;

  try {
    // 가장 최신 데이터만 동기화 (중간 변경사항은 무시)
    const latestItem = syncQueue[syncQueue.length - 1];
    syncQueue = []; // 큐 비우기

    logger.info("🚀 debouncedServerSync - 큐 처리 시작", {
      queueLength: syncQueue.length,
      retryCount: latestItem.retryCount,
      studentCount: latestItem.data.students.length,
      subjectCount: latestItem.data.subjects.length,
      sessionCount: latestItem.data.sessions.length,
      enrollmentCount: latestItem.data.enrollments.length,
    });

    const result = await syncToServer(latestItem.data);

    if (!result.success) {
      // 재시도 로직
      if (latestItem.retryCount < MAX_RETRY_COUNT) {
        logger.warn("debouncedServerSync - 동기화 실패, 재시도 예약", {
          retryCount: latestItem.retryCount + 1,
          maxRetry: MAX_RETRY_COUNT,
        });

        // 재시도 아이템을 큐에 다시 추가
        setTimeout(() => {
          syncQueue.push({
            ...latestItem,
            retryCount: latestItem.retryCount + 1,
          });
        }, RETRY_DELAY);
      } else {
        logger.error("debouncedServerSync - 최대 재시도 횟수 초과", {
          maxRetry: MAX_RETRY_COUNT,
          error: result.error,
        });

        // 사용자에게 알림 (선택적)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("syncFailed", {
              detail: { error: result.error },
            })
          );
        }
      }
    } else {
      logger.info("debouncedServerSync - 동기화 완료", {
        syncedAt: result.syncedAt,
      });

      // 🆕 동기화 완료 후 첫 번째 변경 시간 리셋
      firstChangeTime = null;

      // 동기화 성공 이벤트
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("syncSuccess", {
            detail: { syncedAt: result.syncedAt },
          })
        );
      }
    }
  } catch (error) {
    logger.error(
      "debouncedServerSync - 큐 처리 중 오류:",
      undefined,
      error as Error
    );
  } finally {
    isSyncing = false;

    // 큐에 남은 아이템이 있으면 다시 처리 예약
    if (syncQueue.length > 0) {
      setTimeout(processSyncQueue, 1000);
    }
  }
};

/**
 * 동기화 타이머 시작 (리셋 디바운스 방식)
 */
const startSyncTimer = (): void => {
  // 기존 타이머가 있으면 취소 (리셋)
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  // 🆕 안전장치: 첫 번째 변경으로부터 최대 지연 시간 체크
  const now = new Date().toISOString();
  if (firstChangeTime) {
    const timeSinceFirstChange =
      new Date(now).getTime() - new Date(firstChangeTime).getTime();

    if (timeSinceFirstChange >= MAX_DELAY) {
      // 최대 지연 시간 초과 → 즉시 동기화
      logger.info("debouncedServerSync - 최대 지연 시간 초과, 즉시 동기화", {
        firstChangeTime,
        timeSinceFirstChange,
        maxDelay: MAX_DELAY,
      });
      processSyncQueue();
      return;
    }
  }

  // 새로운 타이머 시작 (setTimeout 사용)
  syncTimer = setTimeout(() => {
    processSyncQueue();
    syncTimer = null; // 타이머 완료 후 null로 설정
    firstChangeTime = null; // 첫 번째 변경 시간 리셋
  }, SYNC_INTERVAL);

  logger.debug("debouncedServerSync - 동기화 타이머 시작/리셋", {
    interval: SYNC_INTERVAL,
    firstChangeTime,
  });
};

/**
 * 동기화 타이머 중지
 */
const stopSyncTimer = (): void => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
    firstChangeTime = null; // 첫 번째 변경 시간도 리셋
    logger.debug("debouncedServerSync - 동기화 타이머 중지");
  }
};

// ===== 공개 API =====

/**
 * 데이터 변경사항을 동기화 큐에 추가
 */
export const scheduleServerSync = (data: ClassPlannerData): void => {
  try {
    if (typeof window === "undefined") {
      logger.debug("debouncedServerSync - SSR 환경, 동기화 건너뜀");
      return;
    }

    // 🆕 첫 번째 변경 시간 추적 (안전장치용)
    if (!firstChangeTime) {
      firstChangeTime = new Date().toISOString();
      logger.debug("debouncedServerSync - 첫 번째 변경 시간 기록", {
        firstChangeTime,
      });
    }

    // 새로운 동기화 아이템 생성
    const syncItem: SyncQueueItem = {
      data: { ...data },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    // 기존 큐 클리어 (최신 데이터만 유지)
    syncQueue = [syncItem];

    logger.debug("debouncedServerSync - 동기화 예약 (리셋 디바운스)", {
      timestamp: syncItem.timestamp,
      queueLength: syncQueue.length,
      firstChangeTime,
      willResetTimer: !!syncTimer,
    });

    // 🔄 항상 타이머 시작/리셋 (리셋 디바운스)
    startSyncTimer();
  } catch (error) {
    logger.error(
      "debouncedServerSync - 동기화 예약 실패:",
      undefined,
      error as Error
    );
  }
};

/**
 * 즉시 동기화 (중요한 작업용)
 */
export const forceSyncToServer = async (
  data: ClassPlannerData
): Promise<SyncResult> => {
  try {
    logger.info("debouncedServerSync - 즉시 동기화 요청");

    const result = await syncToServer(data);

    if (result.success) {
      // 성공 시 큐에서 해당 데이터 제거 (현재 시간으로 필터링)
      const currentTime = new Date().toISOString();
      syncQueue = syncQueue.filter(
        (item) =>
          Math.abs(
            new Date(item.timestamp).getTime() - new Date(currentTime).getTime()
          ) > 1000
      );
    }

    return result;
  } catch (error) {
    logger.error(
      "debouncedServerSync - 즉시 동기화 실패:",
      undefined,
      error as Error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "즉시 동기화 실패",
    };
  }
};

/**
 * 동기화 시스템 초기화
 */
export const initializeSyncSystem = (): void => {
  try {
    if (typeof window === "undefined") {
      return;
    }

    logger.info("debouncedServerSync - 동기화 시스템 초기화");

    // 기존 타이머 정리
    stopSyncTimer();

    // 큐 초기화
    syncQueue = [];
    isSyncing = false;

    // localStorage 변경 이벤트 리스너
    window.addEventListener("classPlannerDataChanged", (event: any) => {
      const data = event.detail as ClassPlannerData;
      scheduleServerSync(data);
    });

    // 페이지 언로드 시 즉시 동기화
    window.addEventListener("beforeunload", async () => {
      if (syncQueue.length > 0) {
        const latestData = syncQueue[syncQueue.length - 1].data;
        await forceSyncToServer(latestData);
      }
    });

    // 로그아웃 시 즉시 동기화
    window.addEventListener("userLoggedOut", async () => {
      if (syncQueue.length > 0) {
        const latestData = syncQueue[syncQueue.length - 1].data;
        await forceSyncToServer(latestData);
      }
      stopSyncTimer();
    });

    logger.debug("debouncedServerSync - 이벤트 리스너 등록 완료");
  } catch (error) {
    logger.error(
      "debouncedServerSync - 초기화 실패:",
      undefined,
      error as Error
    );
  }
};

/**
 * 동기화 시스템 정리
 */
export const cleanupSyncSystem = (): void => {
  try {
    stopSyncTimer();
    syncQueue = [];
    isSyncing = false;
    lastSyncTime = null;
    firstChangeTime = null; // 🆕 첫 번째 변경 시간도 리셋

    logger.info("debouncedServerSync - 시스템 정리 완료");
  } catch (error) {
    logger.error("debouncedServerSync - 정리 실패:", undefined, error as Error);
  }
};

/**
 * 동기화 상태 조회
 */
export const getSyncStatus = () => {
  return {
    isActive: !!syncTimer,
    queueLength: syncQueue.length,
    isSyncing,
    lastSyncTime,
    firstChangeTime, // 🆕 첫 번째 변경 시간
    nextSyncIn: syncTimer ? SYNC_INTERVAL : null,
    maxDelay: MAX_DELAY, // 🆕 최대 지연 시간
  };
};
