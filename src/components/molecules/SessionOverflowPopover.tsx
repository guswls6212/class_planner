"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { Subject, Session } from "@/lib/planner";

export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
  accent: string;
  toneBg: string;       // tone.bg for mini-card background
  startTime: string;
  endTime: string;
  teacherName?: string;
  studentCount: number;
}

interface Props {
  title: string;
  items: OverflowSessionItem[];
  sessions?: Session[];   // parallel to items; if omitted, drag is disabled
  onSelect: (id: string) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;  // if omitted, uses fallback position
  onSessionDragStart?: (session: Session, e: React.DragEvent<HTMLButtonElement>) => void;
}

const POPOVER_WIDTH = 264;

export function SessionOverflowPopover({
  title,
  items,
  sessions,
  onSelect,
  onClose,
  triggerRef,
  onSessionDragStart,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Compute fixed viewport position from trigger's bounding rect
  useEffect(() => {
    const el = triggerRef?.current;
    if (!el) {
      setPos({ top: 8, left: 8 }); // fallback (e.g. in tests without a real trigger)
      return;
    }
    const r = el.getBoundingClientRect();
    const estimatedH = items.length * 66 + 60; // ~66px/card + 60px header+footer
    const top =
      r.bottom + estimatedH > window.innerHeight - 8
        ? r.top - estimatedH - 4
        : r.bottom + 4;
    const left = r.right - POPOVER_WIDTH < 8 ? 8 : r.right - POPOVER_WIDTH;
    setPos({ top, left });
  }, [triggerRef, items.length]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Autofocus first item once position is known
  useEffect(() => {
    if (!pos) return;
    const first = popoverRef.current?.querySelector<HTMLButtonElement>(
      "[data-overflow-item]"
    );
    first?.focus();
  }, [pos]);

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const btns = Array.from(
        popoverRef.current?.querySelectorAll<HTMLButtonElement>(
          "[data-overflow-item]"
        ) ?? []
      );
      const next =
        e.key === "ArrowDown"
          ? btns[(idx + 1) % btns.length]
          : btns[(idx - 1 + btns.length) % btns.length];
      next?.focus();
    },
    []
  );

  // title format: "11:30 · 숨은 세션 2개"
  const dotIdx = title.indexOf(" · ");
  const timeLabel = dotIdx !== -1 ? title.slice(0, dotIdx) : "";
  const countLabel = dotIdx !== -1 ? title.slice(dotIdx + " · ".length) : title;

  const canDrag = Boolean(onSessionDragStart && sessions?.length);

  // Don't render until position is ready (prevents viewport-edge flash)
  if (!pos) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop — outside grid stacking context */}
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />

      {/* Popover — rendered at document.body via portal, always above session blocks */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={title}
        className="fixed z-[9999] overflow-hidden rounded-[var(--radius-admin-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md"
        style={{ width: POPOVER_WIDTH, top: pos.top, left: pos.left }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
          <span className="flex-1 text-[11px] font-semibold text-[var(--color-text-primary)] truncate">
            {countLabel}
          </span>
          {timeLabel && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {timeLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-base leading-none p-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Design D — Mini session cards with drag handle */}
        <ul className="flex flex-col py-1">
          {items.map((item, idx) => {
            const session = sessions?.[idx] ?? null;
            const isDraggable = canDrag && Boolean(session);
            return (
              <li key={item.id} className="px-1.5 py-0.5">
                <button
                  type="button"
                  data-overflow-item="true"
                  draggable={isDraggable}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(e) => handleItemKeyDown(e, idx)}
                  onDragStart={
                    session && onSessionDragStart
                      ? (e) => {
                          e.dataTransfer.setData(
                            "text/plain",
                            `session:${session.id}`
                          );
                          e.dataTransfer.effectAllowed = "move";
                          onSessionDragStart(session, e);
                        }
                      : undefined
                  }
                  style={{
                    background: item.toneBg,
                    borderLeftColor: item.accent,
                  }}
                  className={[
                    "group w-full flex items-center gap-2.5 rounded-[5px]",
                    "border-l-[3px] px-2.5 py-2 text-left select-none",
                    "transition-[transform,box-shadow] duration-[120ms]",
                    "hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.3)]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                    isDraggable
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  {/* Session info */}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] font-bold truncate">
                      {item.subject?.name ?? "수업"}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px] opacity-70">
                      <span>
                        {item.startTime}–{item.endTime}
                      </span>
                      {item.teacherName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.teacherName}</span>
                        </>
                      )}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-black/10">
                        학생 {item.studentCount}명
                      </span>
                    </span>
                  </span>

                  {/* Drag handle — 3×2 dot grid, visible on hover */}
                  {isDraggable && (
                    <span
                      aria-hidden="true"
                      className="flex flex-col gap-[2.5px] shrink-0 opacity-0 group-hover:opacity-50 transition-opacity duration-150 pointer-events-none"
                    >
                      {[0, 1, 2].map((r) => (
                        <span key={r} className="flex gap-[2.5px]">
                          {[0, 1].map((c) => (
                            <span
                              key={c}
                              className="w-[3px] h-[3px] rounded-full bg-current"
                            />
                          ))}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Drag hint footer */}
        {canDrag && (
          <div className="px-3 py-1.5 border-t border-[var(--color-border)] text-[9px] text-[var(--color-text-muted)]">
            카드를 드래그해서 다른 시간대로 이동
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
