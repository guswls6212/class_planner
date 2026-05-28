/**
 * 전역 toast 래퍼.
 * sonner import는 이 파일에서만 허용 — 코드베이스 전체는 이 래퍼를 경유한다.
 * import { showError } from '@/lib/toast'
 *
 * 모든 wrapper는 notificationCenter ring buffer에도 자동 push — 사용자가 4초 뒤
 * 사라진 토스트를 알림 히스토리(헤더 종 아이콘)에서 재조회 가능.
 * undo/action 토스트도 push되며, action retract(undo 실행 시 ring buffer 제거)는
 * Phase 2에서 검토 (현재는 모든 발생을 보존 — 운영자가 어떤 작업이 일어났는지 추적 가능).
 */
import { createElement } from "react";
import { toast } from "sonner";
import {
  ToastContent,
  type ToastVariant,
} from "../components/atoms/ToastContent";
import { UndoToastContent } from "../components/atoms/UndoToastContent";
import { ActionToastContent } from "../components/atoms/ActionToastContent";
import { pushNotificationForCurrentUser } from "./notificationCenter";

const DEFAULT_DURATION_MS = 4000;

function showVariant(variant: ToastVariant, message: string) {
  toast.custom(
    () => createElement(ToastContent, { message, variant }),
    { duration: DEFAULT_DURATION_MS },
  );
  pushNotificationForCurrentUser(variant, message);
}

export function showToast(
  type: "error" | "success" | "warning" | "info",
  message: string,
) {
  showVariant(type, message);
}

export const showError = (message: string) => showVariant("error", message);
export const showSuccess = (message: string) => showVariant("success", message);

/**
 * Dev-only toast — Mockup E 채택 (2026-05-28 사용자 픽).
 * Production (NODE_ENV !== "development" + NEXT_PUBLIC_DEBUG_TOAST !== "1") → noop.
 *
 * 흐름:
 *   - Production: 사용자 0 노출
 *   - Development:
 *     1. In-app DEV badge toast 즉시 visible
 *     2. omni-radar 자동 송신 (event_type=debug_toast) — history grep 가능
 *
 * 사용:
 *   debugToast("info", "같은 요일 — 출결 그대로", { category: "session-drop" });
 *   debugToast("success", "출결 N건 함께 이동", { category: "attendance-migrate" });
 */
export function debugToast(
  level: "info" | "success" | "warning" | "error",
  message: string,
  options?: { category?: string; metadata?: Record<string, unknown> },
) {
  const isDev = process.env.NODE_ENV === "development";
  const isDebugFlagOn = process.env.NEXT_PUBLIC_DEBUG_TOAST === "1";
  if (!isDev && !isDebugFlagOn) return;

  // In-app DEV badge — message 앞에 [DEV] prefix (DEV badge 시각 표지)
  showVariant(level, `[DEV] ${message}`);

  // omni-radar 자동 송신 — fire-and-forget (radar env 미설정 시 noop)
  void import("./observability/omni-radar").then(({ sendDebugEvent }) => {
    void sendDebugEvent({
      level,
      message,
      category: options?.category,
      metadata: options?.metadata,
    });
  });
}

/**
 * Toast with an "undo" action button. Used for destructive mutations
 * (delete student/subject/teacher/session) so users can recover from
 * accidental clicks within the duration window (default 5s).
 *
 * Pattern: caller defers the actual server-side commit, shows this
 * toast, and either:
 *   - cancels the deferred commit + restores local state when onUndo fires
 *   - proceeds with the commit when the duration elapses (no undo click)
 */
export function showUndoToast(opts: {
  message: string;
  onUndo: () => void;
  durationMs?: number;
}) {
  const duration = opts.durationMs ?? 5000;
  toast.custom(
    (toastId) =>
      createElement(UndoToastContent, {
        message: opts.message,
        onUndo: opts.onUndo,
        toastId,
      }),
    { duration },
  );
  // undo 토스트는 "info" level로 기록 — 실제 액션 추적이 목적이지 사용자 attention 필요 X
  pushNotificationForCurrentUser("info", opts.message);
}

/**
 * 다중 항목 작업(예: 5개 일괄 삭제)용 undo 토스트.
 * 단일 showUndoToast의 thin wrapper — duration default 7s (5개 검토 + 클릭에 5s 빠듯)
 * 메시지: `${count}개 ${op} — 되돌리기`
 */
export function showBulkUndoToast(opts: {
  count: number;
  op: string;
  onUndo: () => void;
  durationMs?: number;
}) {
  showUndoToast({
    message: `${opts.count}개 ${opts.op}`,
    onUndo: opts.onUndo,
    durationMs: opts.durationMs ?? 7000,
  });
}

/**
 * 액션 버튼이 달린 토스트. 사용자에게 알림 + 명시적 행동 유도.
 *
 * 사용 예: "다른 관리자가 시간표를 변경했어요" + [새로고침]
 *
 * UndoToastContent와 분리: undo는 destructive(빨간), action은 info/warning(파란/주황).
 *
 * Default duration 10s — 사용자 인지 + 클릭에 충분한 시간 (banner의 "영구 visible"
 * 보다 짧지만 토스트 dismiss로 충분히 인지 가능).
 *
 * @returns toast id (외부에서 dismiss 가능)
 */
export function showActionToast(opts: {
  message: string;
  actionLabel: string;
  onAction: () => void;
  variant?: "info" | "warning";
  durationMs?: number;
}): string | number {
  const duration = opts.durationMs ?? 10000;
  const id = toast.custom(
    (toastId) =>
      createElement(ActionToastContent, {
        message: opts.message,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction,
        toastId,
        variant: opts.variant ?? "info",
      }),
    { duration },
  );
  pushNotificationForCurrentUser(opts.variant ?? "info", opts.message);
  return id;
}
