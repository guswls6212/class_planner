"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, SkipForward, X } from "lucide-react";
import { useTour } from "@/hooks/useTour";
import { showSuccess } from "@/lib/toast";
import type { TourPlacement } from "@/lib/tour-steps";

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_OFFSET = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_ESTIMATED_HEIGHT = 180;
const VIEWPORT_MARGIN = 16;

type ResolvedPlacement = "top" | "bottom" | "left" | "right";

function resolvePlacement(
  rect: DOMRect,
  placement: TourPlacement,
  vw: number,
  vh: number,
): ResolvedPlacement {
  if (placement !== "auto") return placement;
  const ordered: Array<[ResolvedPlacement, number]> = [
    ["bottom", vh - rect.bottom],
    ["top", rect.top],
    ["right", vw - rect.right],
    ["left", rect.left],
  ];
  ordered.sort((a, b) => b[1] - a[1]);
  return ordered[0][0];
}

function computeTooltipPosition(
  rect: DOMRect,
  place: ResolvedPlacement,
  vw: number,
  vh: number,
) {
  let top = 0;
  let left = 0;
  switch (place) {
    case "top":
      top = rect.top - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "bottom":
      top = rect.bottom + TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2;
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
      break;
    case "right":
      top = rect.top + rect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2;
      left = rect.right + TOOLTIP_OFFSET;
      break;
  }
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - TOOLTIP_ESTIMATED_HEIGHT - VIEWPORT_MARGIN));
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN));
  return { top, left };
}

export function InlineTour() {
  const tour = useTour();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [viewport, setViewport] = useState({ vw: 0, vh: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () =>
      setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!tour.isActive) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.requestAnimationFrame(() => {
      tooltipRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(id);
      previousFocusRef.current?.focus();
    };
  }, [tour.isActive]);

  useEffect(() => {
    if (!tour.isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tour.skip();
        return;
      }
      if (e.key === "Tab" && tooltipRef.current) {
        const focusables = tooltipRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tour.isActive, tour]);

  const handleComplete = useCallback(() => {
    tour.complete();
    showSuccess("튜토리얼 완료 ✓");
  }, [tour]);

  const handleNext = useCallback(() => {
    if (tour.currentStep === tour.totalSteps - 1) {
      handleComplete();
    } else {
      tour.next();
    }
  }, [tour, handleComplete]);

  const isLastStep = tour.currentStep === tour.totalSteps - 1;
  const isFirstStep = tour.currentStep === 0;

  const placement = useMemo<ResolvedPlacement>(() => {
    if (!tour.targetRect || !tour.step) return "bottom";
    return resolvePlacement(
      tour.targetRect,
      tour.step.placement || "auto",
      viewport.vw,
      viewport.vh,
    );
  }, [tour.targetRect, tour.step, viewport]);

  const tooltipPos = useMemo(() => {
    if (!tour.targetRect) return { top: 0, left: 0 };
    return computeTooltipPosition(
      tour.targetRect,
      placement,
      viewport.vw,
      viewport.vh,
    );
  }, [tour.targetRect, placement, viewport]);

  if (!tour.isActive || !tour.step) return null;

  if (!tour.targetRect) {
    return (
      <div
        className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center"
        data-testid="inline-tour-dim-waiting"
        role="dialog"
        aria-modal="true"
        aria-label="튜토리얼 로딩 중"
      >
        <div className="rounded-lg bg-zinc-900 border border-amber-500/40 px-5 py-3 text-amber-200 text-sm">
          튜토리얼 준비 중…
        </div>
      </div>
    );
  }

  const rect = tour.targetRect;
  const spotlightTop = Math.max(0, rect.top - SPOTLIGHT_PADDING);
  const spotlightLeft = Math.max(0, rect.left - SPOTLIGHT_PADDING);
  const spotlightWidth = rect.width + SPOTLIGHT_PADDING * 2;
  const spotlightHeight = rect.height + SPOTLIGHT_PADDING * 2;

  return (
    <div
      className="fixed inset-0 z-[10000] pointer-events-none"
      data-testid="inline-tour"
    >
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{ top: 0, left: 0, right: 0, height: spotlightTop }}
        onClick={tour.skip}
        data-testid="inline-tour-dim-top"
        aria-hidden="true"
      />
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{
          top: spotlightTop,
          left: 0,
          width: spotlightLeft,
          height: spotlightHeight,
        }}
        onClick={tour.skip}
        data-testid="inline-tour-dim-left"
        aria-hidden="true"
      />
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{
          top: spotlightTop,
          left: spotlightLeft + spotlightWidth,
          right: 0,
          height: spotlightHeight,
        }}
        onClick={tour.skip}
        data-testid="inline-tour-dim-right"
        aria-hidden="true"
      />
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{
          top: spotlightTop + spotlightHeight,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onClick={tour.skip}
        data-testid="inline-tour-dim-bottom"
        aria-hidden="true"
      />

      <div
        className="absolute rounded-lg ring-2 ring-amber-400 pointer-events-none"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightWidth,
          height: spotlightHeight,
        }}
        data-testid="inline-tour-spotlight"
        aria-hidden="true"
      />

      <div
        ref={tooltipRef}
        className="absolute pointer-events-auto rounded-xl border border-amber-500/40 bg-zinc-900 shadow-2xl outline-none"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_WIDTH,
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-tour-tooltip-title"
        aria-describedby="inline-tour-tooltip-desc"
        data-testid="inline-tour-tooltip"
        data-placement={placement}
      >
        <div className="p-4 space-y-3">
          {/* Progress bar — amber (CORE 1-6) → sky (LOGIN 7-12) gradient. mockup login-tour-extension D variant. */}
          <div data-testid="inline-tour-progress">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-amber-300 font-mono">
                {tour.currentStep + 1}/{tour.totalSteps}
                {tour.step.segment === "login" ? " — 로그인 후 확장" : ""}
              </span>
              <span className="text-[10px] text-zinc-400">
                {Math.round(((tour.currentStep + 1) / tour.totalSteps) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-sky-500 transition-all"
                style={{
                  width: `${((tour.currentStep + 1) / tour.totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h2
              id="inline-tour-tooltip-title"
              className="text-[14px] font-semibold text-amber-200"
            >
              {tour.step.title}
            </h2>
            <button
              type="button"
              onClick={tour.skip}
              aria-label="튜토리얼 닫기"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p
            id="inline-tour-tooltip-desc"
            className="text-[12px] text-zinc-200 leading-relaxed"
          >
            {tour.step.description}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {!isLastStep ? (
              <button
                type="button"
                onClick={tour.skip}
                className="px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
              >
                <SkipForward className="w-3 h-3" />
                건너뛰기
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={tour.prev}
                  className="px-2 py-1 rounded text-[11px] text-zinc-300 hover:bg-white/5 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                >
                  <ChevronLeft className="w-3 h-3" />
                  이전
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium text-[11px] flex items-center gap-1 transition-colors flex-shrink-0 whitespace-nowrap"
              >
                {isLastStep ? "완료" : "다음"}
                {!isLastStep && <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
