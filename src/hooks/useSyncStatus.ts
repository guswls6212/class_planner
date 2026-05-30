"use client";

import { useEffect, useState } from "react";
import {
  type SyncStatus,
  getSyncStatus,
  subscribeSyncStatus,
} from "@/lib/apiSync";

/**
 * apiSync의 fire-and-forget sync 상태를 React에서 구독.
 * 토스트는 dismiss되면 사라지지만 sync 상태 indicator는 영구 visible해야
 * 사용자가 토스트를 놓쳐도 사고를 인지할 수 있음.
 *
 * 상태:
 * - "idle": 정상 (기본). 모든 최근 sync 성공.
 * - "failed_retrying": 최근 실패 중. 자동 재시도 진행 중 (최대 ~3분).
 * - "failed_giving_up": 10회 retry 후 포기. 사용자가 새로고침/재시도 필요.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());

  useEffect(() => {
    // mount 시점의 최신 값으로 한 번 더 동기화 (apiSync 변경이 mount 전 발생했을 가능성)
    setStatus(getSyncStatus());
    const unsubscribe = subscribeSyncStatus(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
