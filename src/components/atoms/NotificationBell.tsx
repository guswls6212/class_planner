"use client";

import { forwardRef } from "react";
import { Bell } from "lucide-react";

export type NotificationBellSize = "sm" | "md" | "nav";

interface NotificationBellProps {
  /** 미확인 알림 수 (배지에 표시). 0이면 배지 미렌더. */
  unread: number;
  /** unread > 0일 때 박동 애니메이션 적용 — prefers-reduced-motion 자동 비활성. */
  pulse?: boolean;
  /** 토글 핸들러. */
  onClick: () => void;
  /** 드롭다운 열려있을 때 트리거 강조용. */
  active?: boolean;
  /**
   * 트리거 사이즈:
   * - "sm": 모바일 TopBar (w-8 h-8, icon 16)
   * - "md": Sidebar expanded — 학원 이름 옆 inline (w-9 h-9, icon 18)
   * - "nav": Sidebar collapsed — nav menu item과 동일 크기 (h-10 + icon 22, strokeWidth 1.5)
   */
  size?: NotificationBellSize;
  /** @deprecated `size="sm"` 사용. compat용으로 유지. */
  compact?: boolean;
}

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  function NotificationBell({ unread, pulse, onClick, active, size, compact }, ref) {
    // compact 호환 처리 — compact=true → size="sm"
    const resolved: NotificationBellSize = size ?? (compact ? "sm" : "md");

    const sizeClass =
      resolved === "sm" ? "w-8 h-8" :
      resolved === "md" ? "w-9 h-9" :
      "h-10 w-10"; // nav
    const iconSize =
      resolved === "sm" ? 16 :
      resolved === "md" ? 18 :
      22; // nav — Sidebar.tsx의 nav icon size와 동등
    const strokeWidth = resolved === "nav" ? 1.5 : 2;
    const ariaLabel = unread > 0 ? `알림 ${unread}개` : "알림";

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`${sizeClass} relative inline-flex items-center justify-center rounded-admin-md transition-colors ${
          active
            ? "text-[var(--color-text-primary)] bg-[var(--color-overlay-light)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
        }`}
      >
        <Bell size={iconSize} strokeWidth={strokeWidth} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 inline-flex"
          >
            {pulse && (
              <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
            )}
            <span className="relative min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold inline-flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </button>
    );
  },
);
