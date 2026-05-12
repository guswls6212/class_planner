"use client";

import { forwardRef } from "react";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  /** 미확인 알림 수 (배지에 표시). 0이면 배지 미렌더. */
  unread: number;
  /** unread > 0일 때 박동 애니메이션 적용 — prefers-reduced-motion 자동 비활성. */
  pulse?: boolean;
  /** 토글 핸들러. */
  onClick: () => void;
  /** 드롭다운 열려있을 때 트리거 강조용. */
  active?: boolean;
  /** 컴팩트 사이즈 (모바일 TopBar). 기본 sidebar 사이즈 (w-9 h-9). */
  compact?: boolean;
}

export const NotificationBell = forwardRef<HTMLButtonElement, NotificationBellProps>(
  function NotificationBell({ unread, pulse, onClick, active, compact }, ref) {
    const sizeClass = compact ? "w-8 h-8" : "w-9 h-9";
    const iconSize = compact ? 16 : 18;
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
        <Bell size={iconSize} strokeWidth={1.5} />
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
