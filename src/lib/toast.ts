/**
 * 전역 toast 래퍼.
 * sonner import는 이 파일에서만 허용 — 코드베이스 전체는 이 래퍼를 경유한다.
 * import { showError } from '@/lib/toast'
 */
import { toast } from "sonner";

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
