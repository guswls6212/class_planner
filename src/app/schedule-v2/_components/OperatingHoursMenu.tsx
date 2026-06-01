"use client";

/**
 * schedule-v2 운영시간 — O3 드롭다운 메뉴 + T1 스텝퍼 (2026-06-01 사용자 픽).
 *
 * settings 카드의 이중 토글을 대체 — 버튼 1클릭 → select 식 메뉴(현재값 ✓).
 * "사용자 지정"이면 시작·종료를 스텝퍼(− 시 +)로 — 24-item 드롭다운 제거(모바일 안 넘침),
 * 종료는 24시까지 지원. 저장 로직은 useTimeRange(readStoredRange/writeStoredRange) 재사용.
 * onChange 로 호출측이 그리드 range 즉시 갱신.
 */

import { useEffect, useRef, useState } from "react";
import {
  readStoredRange,
  writeStoredRange,
  type TimeRangeMode,
} from "@/hooks/useTimeRange";

const MODES: { key: TimeRangeMode; label: string; sub: string }[] = [
  { key: "default", label: "기본", sub: "9–23시" },
  { key: "auto", label: "자동", sub: "데이터 기반" },
  { key: "custom", label: "사용자 지정", sub: "직접 설정" },
];

function summaryOf(mode: TimeRangeMode, s: number, e: number): string {
  if (mode === "default") return "9–23시";
  if (mode === "auto") return "자동";
  return `${s}–${e}시`;
}

export default function OperatingHoursMenu({
  userId,
  onChange,
}: {
  userId: string | null;
  onChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TimeRangeMode>("default");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);
  const ref = useRef<HTMLDivElement>(null);

  // SSR-safe: 마운트 후 저장값 read.
  useEffect(() => {
    const stored = readStoredRange(userId);
    if (!stored) return;
    setMode(stored.mode);
    if (stored.mode === "custom") {
      if (typeof stored.startHour === "number") setStartHour(stored.startHour);
      if (typeof stored.endHour === "number") setEndHour(stored.endHour);
    }
  }, [userId]);

  // 바깥 클릭 닫기.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pickMode = (m: TimeRangeMode) => {
    setMode(m);
    if (m === "custom") {
      writeStoredRange(userId, { mode: "custom", startHour, endHour });
    } else {
      writeStoredRange(userId, { mode: m });
      setOpen(false);
    }
    onChange?.();
  };

  // 스텝퍼가 min/max 로 start < end 를 보장 → 그대로 저장.
  const setStart = (v: number) => {
    setStartHour(v);
    writeStoredRange(userId, { mode: "custom", startHour: v, endHour });
    onChange?.();
  };
  const setEnd = (v: number) => {
    setEndHour(v);
    writeStoredRange(userId, { mode: "custom", startHour, endHour: v });
    onChange?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="operating-hours-menu"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
          open
            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <span aria-hidden>⚙</span> {summaryOf(mode, startHour, endHour)}
        <span className="text-[10px] opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-2xl">
          <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            시간표 운영시간
          </div>
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => pickMode(m.key)}
              data-testid={`operating-hours-mode-${m.key}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-[var(--color-bg-tertiary)]"
            >
              <span className="w-3 text-[var(--color-accent)]">{mode === m.key ? "✓" : ""}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{m.label}</span>
              <span className="ml-auto text-[var(--color-text-muted)]">{m.sub}</span>
            </button>
          ))}
          {mode === "custom" && (
            <div className="mt-1 border-t border-[var(--color-border)] px-3 pb-2.5 pt-2.5">
              <div className="flex items-end gap-2">
                <HourStepper
                  label="시작"
                  value={startHour}
                  min={0}
                  max={endHour - 1}
                  onChange={setStart}
                />
                <span className="pb-1.5 text-[var(--color-text-muted)]">–</span>
                <HourStepper
                  label="종료"
                  value={endHour}
                  min={startHour + 1}
                  max={24}
                  onChange={setEnd}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HourStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-[var(--color-text-muted)]">{label}</span>
      <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <button
          type="button"
          aria-label={`${label} 1시간 줄이기`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="px-2 py-1 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
        >
          −
        </button>
        <span className="w-10 text-center text-[13px] font-semibold tabular-nums text-[var(--color-text-primary)]">
          {value}시
        </span>
        <button
          type="button"
          aria-label={`${label} 1시간 늘리기`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="px-2 py-1 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-tertiary)] disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
