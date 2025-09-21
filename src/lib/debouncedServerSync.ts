/**
 * 🔄 Debounced 서버 동기화 시스템
 *
 * localStorage의 classPlannerData 변경사항을 1분마다 서버와 동기화합니다.
 * 사용자 경험을 방해하지 않으면서 데이터 일관성을 보장합니다.
 */

import type { ClassPlannerData } from "./localStorageCrud";
import { logger } from "./logger";
import { getKSTTime } from "./timeUtils";

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

const SYNC_INTERVAL = 60 * 1000; // 1분 (60초)
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5초

// ===== 전역 상태 =====

let syncTimer: NodeJS.Timeout | null = null;
let syncQueue: SyncQueueItem[] = [];
let isSyncing = false;
let lastSyncTime: string | null = null;

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
    const authToken = localStorage.getItem(
      "sb-kcyqftasdxtqslrhbctv-auth-token"
    );
    const authData = authToken ? JSON.parse(authToken) : null;
    const accessToken = authData?.access_token;

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

    const syncedAt = getKSTTime();
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
 * 동기화 타이머 시작
 */
const startSyncTimer = (): void => {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncTimer = setInterval(() => {
    processSyncQueue();
  }, SYNC_INTERVAL);

  logger.debug("debouncedServerSync - 동기화 타이머 시작", {
    interval: SYNC_INTERVAL,
  });
};

/**
 * 동기화 타이머 중지
 */
const stopSyncTimer = (): void => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
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

    // 새로운 동기화 아이템 생성
    const syncItem: SyncQueueItem = {
      data: { ...data },
      timestamp: getKSTTime(),
      retryCount: 0,
    };

    // 기존 큐 클리어 (최신 데이터만 유지)
    syncQueue = [syncItem];

    logger.debug("debouncedServerSync - 동기화 예약", {
      timestamp: syncItem.timestamp,
      queueLength: syncQueue.length,
    });

    // 타이머가 없으면 시작
    if (!syncTimer) {
      startSyncTimer();
    }
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
      const currentTime = getKSTTime();
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
    nextSyncIn: syncTimer ? SYNC_INTERVAL : null,
  };
};
