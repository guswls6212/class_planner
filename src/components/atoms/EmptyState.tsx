"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  children: ReactNode;
  /** optional 아이콘 (좌측 또는 상단). */
  icon?: ReactNode;
  /** optional action 영역 (button, link 등) — 안내 하단 표시. */
  action?: ReactNode;
  /** layout 분기. default "inline" (rounded card, 한 줄 메시지) */
  variant?: "inline" | "card";
  className?: string;
  "data-testid"?: string;
}

/**
 * 빈 상태 안내 SSOT — "데이터가 없습니다" 메시지 통일.
 *
 * variant:
 *  - "inline" (default): rounded-xl border + bg-primary + p-3 + center text.
 *    list 안에서 작은 안내 (예: "더 추가할 학생이 없습니다").
 *  - "card": flex column + center + icon + 큰 메시지 + action.
 *    list 전체가 빈 상태 (예: "학생을 추가해주세요").
 *
 * 예:
 *   <EmptyState>더 추가할 학생이 없습니다</EmptyState>
 *   <EmptyState variant="card" icon={<Inbox size={32} />} action={<button>추가</button>}>
 *     아직 등록된 학생이 없어요
 *   </EmptyState>
 */
export function EmptyState({
  children,
  icon,
  action,
  variant = "inline",
  className = "",
  "data-testid": dataTestId,
}: EmptyStateProps) {
  if (variant === "card") {
    return (
      <div
        className={`flex flex-col items-center gap-3 p-6 text-center ${className}`}
        data-testid={dataTestId}
      >
        {icon && <div className="text-[var(--color-text-muted)]">{icon}</div>}
        <p className="text-[13px] text-[var(--color-text-muted)]">{children}</p>
        {action}
      </div>
    );
  }
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-center text-[12px] text-[var(--color-text-muted)] ${className}`}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}

export default EmptyState;
