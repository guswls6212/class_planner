"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Subject } from "@/lib/planner";

export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
  accent: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
  studentCount: number;
}

interface Props {
  title: string;
  items: OverflowSessionItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SessionOverflowPopover({ title, items, onSelect, onClose }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Autofocus first item on open
  useEffect(() => {
    const first = popoverRef.current?.querySelector<HTMLButtonElement>(
      "[data-overflow-item]"
    );
    first?.focus();
  }, []);

  // Viewport-aware flip detection
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) setFlipUp(true);
    if (rect.right > window.innerWidth - 8) setFlipLeft(true);
  }, []);

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
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
  };

  // title format: "11:30 · 숨은 세션 2개" — split on " · "
  const dotIdx = title.indexOf(" · ");
  const timeLabel = dotIdx !== -1 ? title.slice(0, dotIdx) : "";
  const countLabel = dotIdx !== -1 ? title.slice(dotIdx + 3) : title;

  const posY = flipUp ? "bottom-full mb-1" : "top-full mt-1";
  const posX = flipLeft ? "left-0" : "right-0";

  return (
    <>
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0 z-[998]"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={title}
        className={`absolute ${posY} ${posX} z-[999] overflow-hidden rounded-[var(--radius-admin-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md`}
        style={{ width: 272 }}
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

        {/* Items */}
        <ul className="flex flex-col">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="border-b border-[var(--color-border)] last:border-b-0"
            >
              <button
                type="button"
                data-overflow-item="true"
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
                className="w-full flex items-stretch gap-2.5 px-2.5 py-2 text-left hover:bg-[var(--color-overlay-light)] focus:outline-none focus:bg-[var(--color-overlay-light)]"
              >
                {/* 3px accent bar */}
                <span
                  className="w-[3px] rounded-[2px] shrink-0 self-stretch"
                  style={{ background: item.accent }}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                    {item.subject?.name ?? "수업"}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {item.startTime}–{item.endTime}
                    </span>
                    {item.teacherName && (
                      <>
                        <span
                          className="text-[10px] text-[var(--color-text-muted)]"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {item.teacherName}
                        </span>
                      </>
                    )}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-[var(--color-overlay-light)] text-[var(--color-text-muted)]">
                      학생 {item.studentCount}명
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
