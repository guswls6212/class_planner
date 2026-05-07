"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  writeStoredRange,
  type TimeRange,
  type TimeRangeMode,
} from "../../../hooks/useTimeRange";

interface TimeRangeSelectorProps {
  current: TimeRange;
  userId: string | null;
}

interface Preset {
  label: string;
  mode: TimeRangeMode;
  startHour?: number;
  endHour?: number;
  /** URL query value — useTimeRange가 즉시 반영. */
  query: string;
}

const PRESETS: Preset[] = [
  { label: "기본 (9 - 23시)", mode: "default", query: "default" },
  { label: "자동 (데이터 기반)", mode: "auto", query: "auto" },
  { label: "오전반 (7 - 13시)", mode: "custom", startHour: 7, endHour: 13, query: "7-13" },
  { label: "오후반 (13 - 22시)", mode: "custom", startHour: 13, endHour: 22, query: "13-22" },
  { label: "정규 (8 - 18시)", mode: "custom", startHour: 8, endHour: 18, query: "8-18" },
  { label: "심야 (18 - 24시)", mode: "custom", startHour: 18, endHour: 24, query: "18-24" },
];

function describeCurrent(current: TimeRange): string {
  const range = `${current.startHour}-${current.endHour}시`;
  if (current.mode === "auto") return `${range} · 자동`;
  if (current.mode === "default") return range;
  return range;
}

export default function TimeRangeSelector({
  current,
  userId,
}: TimeRangeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleSelect = (preset: Preset) => {
    writeStoredRange(userId, {
      mode: preset.mode,
      startHour: preset.startHour,
      endHour: preset.endHour,
    });
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("range", preset.query);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="time-range-selector"
      >
        <span aria-hidden="true">⏱</span>
        <span>{describeCurrent(current)}</span>
        <span aria-hidden="true" className="text-[10px]">▾</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="menu"
            className="absolute right-0 top-full mt-1 z-30 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-lg overflow-hidden"
          >
            {PRESETS.map((preset) => {
              const isCurrent =
                (preset.mode === "default" && current.mode === "default") ||
                (preset.mode === "auto" && current.mode === "auto") ||
                (preset.mode === "custom" &&
                  current.mode === "custom" &&
                  preset.startHour === current.startHour &&
                  preset.endHour === current.endHour);
              return (
                <li key={preset.query} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(preset)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      isCurrent
                        ? "bg-[var(--color-bg-secondary)] text-[var(--color-accent)] font-medium"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
