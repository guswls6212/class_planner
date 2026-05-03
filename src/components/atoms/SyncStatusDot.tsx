"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";

/**
 * 헤더 옆에 영구 visible로 표시되는 sync 상태 indicator.
 * 토스트는 dismiss되면 사라지지만 이 dot은 sync 정상화될 때까지 유지.
 *
 * - idle: 표시 없음 (정상 운영 중에는 시각 노이즈 0)
 * - failed_retrying: 노란 ⚠️ (자동 재시도 중)
 * - failed_giving_up: 빨간 ⚠️ (포기, 사용자 액션 필요)
 */
export default function SyncStatusDot() {
  const status = useSyncStatus();

  if (status === "idle") return null;

  if (status === "failed_retrying") {
    return (
      <span
        role="status"
        aria-live="polite"
        title="서버 동기화 일시 실패 — 자동 재시도 중입니다. 로컬 데이터는 안전합니다."
        data-testid="sync-status-dot"
        data-status="retrying"
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      >
        <RefreshCw size={10} strokeWidth={2} className="animate-spin" />
        재시도 중
      </span>
    );
  }

  // failed_giving_up
  return (
    <span
      role="status"
      aria-live="assertive"
      title="서버 동기화 10회 실패 — 페이지 새로고침 또는 인터넷 연결을 확인해주세요. 로컬 데이터는 안전합니다."
      data-testid="sync-status-dot"
      data-status="giving-up"
      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300"
    >
      <AlertTriangle size={10} strokeWidth={2} />
      동기화 실패
    </span>
  );
}
