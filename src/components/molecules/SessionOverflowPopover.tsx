"use client";

import React, { useEffect, useRef } from "react";
import { resolveSessionTone } from "./SessionCard.utils";
import type { Subject } from "@/lib/planner";

export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
  accent: string;       // pre-computed tone.accent value (CSS var or hex)
  startTime: string;    // "11:30"
  endTime: string;      // "12:30"
  teacherName?: string;
  studentCount: number;
}

interface Props {
  title: string;
  items: OverflowSessionItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SessionOverflowPopover({
  title,
  items,
  onSelect,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0 z-[998]"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={title}
        className="absolute top-full right-0 mt-1 z-[999] w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-1.5"
      >
        <div className="text-[10px] text-[var(--color-text-muted)] px-2 py-1">
          {title}
        </div>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const tone = resolveSessionTone(item.subject?.color);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: tone.accent }}
                  />
                  <span className="flex-1 text-left truncate font-medium">
                    {item.subject?.name ?? "수업"}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[80px]">
                    {item.studentNames.join(", ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
