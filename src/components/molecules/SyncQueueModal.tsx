"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  Info,
} from "lucide-react";
import { getContextLabel } from "@/lib/apiSync";
import {
  flushOutbox,
  flushOutboxEntry,
  getOutboxEntries,
  removeOutboxEntry,
  type OutboxEntry,
} from "@/lib/syncOutbox";
import { showToast } from "@/lib/toast";

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

/**
 * sync 큐 모달 — 사용자에게 "어떤 데이터가 안 갔는지 + 어떻게 할 수 있는지"를
 * 명확히 보여주고 액션을 제공.
 *
 * 항목별: [재시도] [버리기]
 * 전체:   [모두 재시도] [모두 버리기] [닫기]
 *
 * Recovery 가이드(Option C 통합): 모달 상단에 안내 — 화면엔 보이지만 다른 기기에선
 * 안 보일 수 있다는 점, 페이지 새로고침 시 동작 등.
 */
export default function SyncQueueModal({
  isOpen,
  onClose,
  userId,
}: SyncQueueModalProps) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // 모달 열릴 때 entries 갱신 + storage event listener로 외부 변경 sync
  useEffect(() => {
    if (!isOpen || !userId) return;
    setEntries(getOutboxEntries(userId));
    const handler = (e: StorageEvent) => {
      if (e.key && e.key.includes("sync_outbox")) {
        setEntries(getOutboxEntries(userId));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [isOpen, userId]);

  const refresh = useCallback(() => {
    if (userId) setEntries(getOutboxEntries(userId));
  }, [userId]);

  const handleRetryOne = useCallback(
    async (entry: OutboxEntry) => {
      if (!userId) return;
      setBusyIds((s) => new Set(s).add(entry.id));
      try {
        const ok = await flushOutboxEntry(userId, entry.id);
        if (ok) {
          showToast("success", `${getContextLabel(entry.context)} 동기화 완료`);
        } else {
          showToast("warning", "다시 실패했어요. 잠시 후 다시 시도해주세요.");
        }
        refresh();
      } finally {
        setBusyIds((s) => {
          const n = new Set(s);
          n.delete(entry.id);
          return n;
        });
      }
    },
    [userId, refresh],
  );

  const handleDiscard = useCallback(
    (entry: OutboxEntry) => {
      if (!userId) return;
      removeOutboxEntry(userId, entry.id);
      showToast("info", `${getContextLabel(entry.context)} 큐에서 제거`);
      refresh();
    },
    [userId, refresh],
  );

  const handleRetryAll = useCallback(async () => {
    if (!userId || entries.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await flushOutbox(userId);
      if (result.sent > 0) {
        showToast("success", `${result.sent}건 동기화 완료`);
      }
      if (result.failed > 0) {
        showToast(
          "warning",
          `${result.failed}건은 데이터 문제로 큐에서 제거됐습니다`,
        );
      }
      if (result.expired > 0) {
        showToast(
          "info",
          `${result.expired}건은 24시간 초과로 만료 — 자동 제거`,
        );
      }
      refresh();
    } finally {
      setBulkBusy(false);
    }
  }, [userId, entries.length, refresh]);

  const handleDiscardAll = useCallback(() => {
    if (!userId || entries.length === 0) return;
    if (
      !window.confirm(
        `${entries.length}개 항목을 모두 큐에서 제거합니다. 취소할 수 없습니다. 계속할까요?`,
      )
    ) {
      return;
    }
    for (const e of entries) {
      removeOutboxEntry(userId, e.id);
    }
    showToast("info", `${entries.length}건 큐에서 제거`);
    refresh();
  }, [userId, entries, refresh]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime(),
      ),
    [entries],
  );

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm">
      <div
        className="fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-queue-modal-title"
        data-testid="sync-queue-modal"
      >
        <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_25px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden max-h-[85vh]">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div>
              <h2
                id="sync-queue-modal-title"
                className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]"
              >
                <AlertTriangle size={16} className="text-amber-500" />
                동기화 큐
                {entries.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                    {entries.length}
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                서버로 아직 못 보낸 변경사항
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded p-1 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]"
              data-testid="sync-queue-modal-close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Recovery 안내 (Option C) */}
          <div className="mx-5 mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex gap-2">
              <Info size={14} className="mt-[1px] flex-shrink-0" />
              <div>
                이 변경사항은 <b>화면엔 보이지만</b> 다른 기기 / 학생용 페이지에는 아직 반영되지 않았어요.
                네트워크가 정상이면 백그라운드에서 자동 재시도됩니다. 즉시 보내려면{" "}
                <b>[모두 재시도]</b>를, 잘못된 작업이면 <b>[버리기]</b>를 선택하세요.
              </div>
            </div>
          </div>

          {/* Body — entries list */}
          <div
            className="flex-1 overflow-y-auto px-5 py-3 space-y-2"
            data-testid="sync-queue-list"
          >
            {sortedEntries.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
                대기 중인 항목이 없습니다
              </div>
            ) : (
              sortedEntries.map((entry) => {
                const label = getContextLabel(entry.context);
                const queued = new Date(entry.queuedAt).toLocaleString(
                  "ko-KR",
                  {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                const isBusy = busyIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    data-testid={`sync-queue-entry-${entry.id}`}
                    data-context={entry.context}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {label}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {queued} 시도 ·{" "}
                        <span className="text-[var(--color-text-tertiary)]">
                          {entry.method} {abbreviateUrl(entry.url)}
                        </span>
                      </div>
                      {entry.lastError && (
                        <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                          {entry.lastError}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRetryOne(entry)}
                        disabled={isBusy || bulkBusy}
                        data-testid={`sync-queue-retry-${entry.id}`}
                        aria-label="다시 시도"
                        title="다시 시도"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RefreshCw
                          size={14}
                          className={isBusy ? "animate-spin" : ""}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscard(entry)}
                        disabled={isBusy || bulkBusy}
                        data-testid={`sync-queue-discard-${entry.id}`}
                        aria-label="버리기"
                        title="이 변경사항 버리기"
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — bulk actions */}
          {sortedEntries.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] px-5 py-3">
              <button
                type="button"
                onClick={handleDiscardAll}
                disabled={bulkBusy}
                data-testid="sync-queue-discard-all"
                className="text-xs text-[var(--color-text-muted)] hover:text-red-600 disabled:opacity-40"
              >
                모두 버리기
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleRetryAll}
                  disabled={bulkBusy}
                  data-testid="sync-queue-retry-all"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={12}
                    className={bulkBusy ? "animate-spin" : ""}
                  />
                  모두 재시도
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** /api/sessions/abc?userId=xxx → /api/sessions/abc */
function abbreviateUrl(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}
