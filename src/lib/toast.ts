/**
 * 전역 toast 래퍼.
 * sonner import는 이 파일에서만 허용 — 코드베이스 전체는 이 래퍼를 경유한다.
 * import { showError } from '@/lib/toast'
 */
import { createElement } from "react";
import { toast } from "sonner";
import {
  ToastContent,
  type ToastVariant,
} from "../components/atoms/ToastContent";
import { UndoToastContent } from "../components/atoms/UndoToastContent";

const DEFAULT_DURATION_MS = 4000;

function showVariant(variant: ToastVariant, message: string) {
  toast.custom(
    () => createElement(ToastContent, { message, variant }),
    { duration: DEFAULT_DURATION_MS },
  );
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
