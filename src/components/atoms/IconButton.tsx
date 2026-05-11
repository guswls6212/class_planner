"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";

interface IconButtonProps {
  children: ReactNode;
  /** 접근성 라벨 — 필수. icon-only 라 라벨 명시 의무. */
  "aria-label": string;
  /** hover tooltip. 미지정 시 aria-label 사용. */
  title?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /**
   * - "neutral": 기본. 닫기/편집 등 중립 액션.
   * - "danger": 삭제 등 위험 액션 (빨강 tinted).
   * - "tinted": entity color 기반 (subject/teacher color 사용 시 style 로 전달).
   * - "ghost": border + bg 없음. minimal.
   */
  variant?: "neutral" | "danger" | "tinted" | "ghost";
  /** entity color hex. variant="tinted" 일 때 background/border 자동 생성. */
  tintColor?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

const VARIANT_CLASS: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  neutral:
    "bg-white/[0.04] border-[var(--color-border)] text-[var(--color-text-muted)] hover:enabled:bg-white/[0.08] hover:enabled:text-[var(--color-text-primary)]",
  danger:
    "bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.25)] text-[#f87171] hover:enabled:bg-[rgba(239,68,68,0.18)]",
  tinted:
    "transition-[filter] hover:enabled:brightness-110",
  ghost:
    "bg-transparent border-transparent text-[var(--color-text-muted)] hover:enabled:bg-white/[0.06] hover:enabled:text-[var(--color-text-primary)]",
};

const hexToRgba = (hex: string, alpha: number): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * 32×32 정사각형 icon-only button. class-planner 전역 통일 (디자인 시스템).
 *
 * 사용처: 모달 헤더 (편집/삭제/닫기), detail panel action 버튼, 좁은 공간의 icon
 * 액션. radius 8px, border 있음.
 *
 * tinted 사용 예 (subject color):
 *   <IconButton variant="tinted" tintColor="#ef4444" aria-label="색 변경">
 *     <span className="w-3.5 h-3.5 rounded-full" style={{ background: "#ef4444" }} />
 *   </IconButton>
 */
export function IconButton({
  children,
  "aria-label": ariaLabel,
  title,
  onClick,
  variant = "neutral",
  tintColor,
  disabled,
  type = "button",
  className = "",
  style,
  "data-testid": dataTestId,
}: IconButtonProps) {
  const variantClass = VARIANT_CLASS[variant];

  // tinted variant — runtime style 로 bg/border 생성
  const tintedStyle: CSSProperties | undefined =
    variant === "tinted" && tintColor
      ? {
          background: hexToRgba(tintColor, 0.15),
          border: `1px solid ${hexToRgba(tintColor, 0.30)}`,
        }
      : undefined;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      data-testid={dataTestId}
      className={[
        "flex items-center justify-center w-8 h-8 rounded-lg border transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClass,
        className,
      ].join(" ")}
      style={{ ...tintedStyle, ...style }}
    >
      {children}
    </button>
  );
}

export default IconButton;
