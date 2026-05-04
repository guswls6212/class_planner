"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { getLastFailureContext, getContextLabel } from "@/lib/apiSync";

const SyncQueueModal = dynamic(
  () => import("../molecules/SyncQueueModal"),
  { ssr: false },
);

interface SyncStatusDotProps {
  /** 모달 [재시도] 액션을 위해 필요. anonymous면 null. */
  userId?: string | null;
}

/**
 * 헤더 옆에 영구 visible로 표시되는 sync 상태 indicator.
 * 토스트는 dismiss되면 사라지지만 이 dot은 sync 정상화될 때까지 유지.
 *
 * - idle: 표시 없음 (정상 운영 중에는 시각 노이즈 0)
 * - failed_retrying: 노란 ⚠️ (자동 재시도 중) — 클릭 시 큐 모달
 * - failed_giving_up: 빨간 ⚠️ (포기, 사용자 액션 필요) — 클릭 시 큐 모달
 *
 * Bug fix (2026-05-04): 이전엔 단순 표시만 했고 사용자가 "어떤 데이터가 실패했는지 /
 * 어떻게 대처해야 하는지" 알 수 없었음. 클릭 → SyncQueueModal로 동기화 큐 항목 리스트
 * + 항목별 재시도/버리기 + 일괄 재시도 액션 제공.
 */
export default function SyncStatusDot({ userId }: SyncStatusDotProps = {}) {
  const status = useSyncStatus();
  const [modalOpen, setModalOpen] = useState(false);

  if (status === "idle") return null;

  const lastContext = getLastFailureContext();
  const contextLabel = lastContext ? getContextLabel(lastContext) : null;

  if (status === "failed_retrying") {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={
            contextLabel
              ? `${contextLabel} 동기화 재시도 중 — 클릭하여 큐 보기`
              : "서버 동기화 재시도 중 — 클릭하여 큐 보기"
          }
          title={
            contextLabel
              ? `${contextLabel} 동기화 일시 실패 — 자동 재시도 중. 클릭하여 자세히.`
              : "서버 동기화 일시 실패 — 자동 재시도 중. 클릭하여 자세히."
          }
          data-testid="sync-status-dot"
          data-status="retrying"
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 cursor-pointer dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
        >
          <RefreshCw size={10} strokeWidth={2} className="animate-spin" />
          {contextLabel ? `${contextLabel} 재시도 중` : "재시도 중"}
        </button>
        <SyncQueueModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          userId={userId ?? null}
        />
      </>
    );
  }

  // failed_giving_up
  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="서버 동기화 실패 — 클릭하여 큐 보기"
        title="서버 동기화 실패 — 클릭하여 자세히 보고 대처하세요."
        data-testid="sync-status-dot"
        data-status="giving-up"
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-200 cursor-pointer dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
      >
        <AlertTriangle size={10} strokeWidth={2} />
        {contextLabel ? `${contextLabel} 동기화 실패` : "동기화 실패"}
      </button>
      <SyncQueueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId ?? null}
      />
    </>
  );
}
