/**
 * 전역 toast 래퍼.
 * sonner import는 이 파일에서만 허용 — 코드베이스 전체는 이 래퍼를 경유한다.
 * import { showError } from '@/lib/toast'
 */
import { createElement } from "react";
import { toast } from "sonner";
import { UndoToastContent } from "../components/atoms/UndoToastContent";

export function showToast(
  type: "error" | "success" | "warning" | "info",
  message: string
) {
  switch (type) {
    case "error":
      toast.error(message);
      break;
    case "success":
      toast.success(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    case "info":
      toast.info(message);
      break;
  }
}

export const showError = (message: string) => toast.error(message);
export const showSuccess = (message: string) => toast.success(message);

/**
 * Toast with an "undo" action button. Used for destructive mutations
 * (delete student/subject/teacher/session) so users can recover from
 * accidental clicks within the duration window (default 5s).
 *
 * Custom JSX render (UndoToastContent) so the styling matches class-planner
 * Admin Amber design tokens (instead of sonner's generic action-button
 * style which felt out of place per user feedback).
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
  // createElement (not JSX) so this file stays .ts (no compilation step
  // needed for tsx). UndoToastContent renders class-planner Admin Amber
  // styling + dismiss via toast.dismiss(toastId).
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
