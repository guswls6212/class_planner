"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface DetailTooltipRow {
  label: string;
  value: ReactNode;
}

export interface DetailTooltipSection {
  title?: string;
  rows: DetailTooltipRow[];
}

interface DetailTooltipProps {
  /** 표시할 섹션 — 모든 섹션의 rows가 비어 있으면 트리거만 렌더 (no-op wrap). */
  sections: DetailTooltipSection[];
  /** 툴팁 위치. default: "top" */
  placement?: "top" | "bottom";
  /** 트리거 (chip, button 등) */
  children: ReactNode;
  /** 트리거 wrapper에 적용 */
  className?: string;
}

function isEmpty(sections: DetailTooltipSection[]): boolean {
  return sections.every((s) => s.rows.length === 0);
}

const TOOLTIP_GAP = 8;

// SSR-safe layout effect: server에선 useEffect, client에선 useLayoutEffect.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Portal 기반 hover/focus 툴팁. 트리거의 boundingRect로 fixed positioning.
 * 모달의 overflow 컨테이너에 클립되지 않도록 document.body 에 렌더한다.
 */
export function DetailTooltip({
  sections,
  placement = "top",
  children,
  className = "",
}: DetailTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // visible 토글 시 트리거 위치 기준 좌표 계산.
  useIsoLayoutEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    if (placement === "top") {
      setPos({ top: rect.top - TOOLTIP_GAP, left: centerX });
    } else {
      setPos({ top: rect.bottom + TOOLTIP_GAP, left: centerX });
    }
  }, [visible, placement]);

  if (isEmpty(sections)) {
    return <span className={className}>{children}</span>;
  }

  const tooltipNode = (
    <span
      role="tooltip"
      data-placement={placement}
      data-visible={visible ? "true" : "false"}
      className={[
        // z-[100000] — modal-backdrop(z:20000) 위에 떠야 모달 안의 chip hover 시 보임.
        "fixed z-[100000] pointer-events-none",
        "transition-opacity duration-150 ease-out",
        visible ? "opacity-100" : "opacity-0",
        "rounded-lg border border-white/10 backdrop-blur-md",
        "px-3.5 py-2.5 shadow-2xl shadow-black/40",
        "min-w-[160px] text-left whitespace-nowrap",
      ].join(" ")}
      style={{
        background: "rgba(20, 22, 28, 0.92)",
        top: pos.top,
        left: pos.left,
        transform:
          placement === "top"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0)",
      }}
    >
      {sections.map((section, i) => (
        <span key={i} className="block">
          {i > 0 && (
            <span
              className="block my-1.5 h-px bg-white/[0.08]"
              aria-hidden="true"
            />
          )}
          {section.title && (
            <span className="block mb-1 text-[9.5px] uppercase tracking-[0.12em] text-[var(--color-text-muted)] font-semibold">
              {section.title}
            </span>
          )}
          {section.rows.map((row, j) => (
            <span
              key={j}
              className="flex justify-between gap-3 text-[11px] py-px"
            >
              <span className="text-[var(--color-text-muted)]">{row.label}</span>
              <span className="text-[var(--color-text-primary)]">
                {row.value}
              </span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {mounted && createPortal(tooltipNode, document.body)}
    </span>
  );
}
