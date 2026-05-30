"use client";

import type { ReactNode } from "react";

interface CTAAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  /** primary: amber accent (default). secondary: bordered outline. */
  variant?: "primary" | "secondary";
  disabled?: boolean;
  ariaLabel?: string;
  "data-testid"?: string;
}

interface EmptyStateCTAProps {
  icon: ReactNode;
  title: string;
  /** 1-2 줄 안내. \n 으로 줄바꿈 가능. */
  description: string;
  primaryAction?: CTAAction;
  secondaryAction?: CTAAction;
  /** 페이지 하단 "다음 할 일" cascade link 등 (옵션). */
  footer?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/**
 * 빈 상태 다음 행동 유도 카드 (D Empty State CTA, phase1-production-release Step 1.4).
 *
 * EmptyWeekState 와 같은 디자인 언어 사용 — backdrop-blur + rounded-2xl + 14×14
 * icon circle + 큰 title + leading description + CTA button(s).
 *
 * EmptyState (atoms) 는 단순 inline 안내 ("더 추가할 학생이 없습니다") 용,
 * 본 molecule 은 신규 가입자 행동 유도 ("첫 학생 추가" CTA) 용.
 *
 * 예:
 *   <EmptyStateCTA
 *     icon={<Users size={26} strokeWidth={1.5} />}
 *     title="아직 등록된 학생이 없어요"
 *     description={"학생을 추가하면 시간표에 배치할 수 있어요"}
 *     primaryAction={{ label: "첫 학생 추가", onClick: openAddModal, icon: <Plus size={14} /> }}
 *   />
 *
 * 상세 mockup: internal-dashboard /strategy/onboarding-walkthrough § Part D
 */
export function EmptyStateCTA({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  footer,
  className = "",
  "data-testid": dataTestId,
}: EmptyStateCTAProps) {
  return (
    <div
      className={`flex flex-col items-center gap-5 p-8 rounded-2xl
                  bg-[var(--color-bg-primary)]/90 backdrop-blur-sm
                  border border-[var(--color-border)] shadow-xl
                  max-w-xs w-full mx-auto text-center ${className}`}
      data-testid={dataTestId ?? "empty-state-cta"}
    >
      <div className="w-14 h-14 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-secondary)]">
        {icon}
      </div>

      <div className="space-y-1.5">
        <p className="text-base font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-2 w-full">
          {primaryAction && (
            <CTAButton action={primaryAction} variant="primary" />
          )}
          {secondaryAction && (
            <CTAButton action={secondaryAction} variant="secondary" />
          )}
        </div>
      )}

      {footer && (
        <div className="w-full pt-3 mt-1 border-t border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)]">
          {footer}
        </div>
      )}
    </div>
  );
}

function CTAButton({
  action,
  variant,
}: {
  action: CTAAction;
  variant: "primary" | "secondary";
}) {
  const resolved = action.variant ?? variant;
  const styleClass =
    resolved === "primary"
      ? "bg-[var(--color-accent)] text-white hover:opacity-90 active:opacity-80"
      : "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]";
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel}
      data-testid={action["data-testid"]}
      className={`flex items-center justify-center gap-2 w-full
                  px-4 py-2.5 rounded-lg text-sm font-semibold
                  transition-opacity transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${styleClass}`}
    >
      {action.icon}
      {action.label}
    </button>
  );
}

export default EmptyStateCTA;
