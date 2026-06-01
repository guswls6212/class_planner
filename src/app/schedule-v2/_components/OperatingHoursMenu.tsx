"use client";

/**
 * schedule-v2 운영시간 — O3 드롭다운 메뉴 (2026-06-01 사용자 픽).
 *
 * settings 카드(OperatingHoursSection)의 이중 토글(⚙ 누르고 → 또 펼치기)을 대체.
 * 버튼 1클릭 → select 식 메뉴(현재값 ✓). "사용자 지정"이면 시작·종료 시간 인라인.
 * 저장 로직은 useTimeRange(readStoredRange/writeStoredRange) 재사용 — 그리드 축/PDF 공용 키.
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

  const changeHour = (which: "start" | "end", value: number) => {
    const s = which === "start" ? value : startHour;
    const e = which === "end" ? value : endHour;
    if (which === "start") setStartHour(value);
    else setEndHour(value);
    if (s < e) {
      writeStoredRange(userId, { mode: "custom", startHour: s, endHour: e });
      onChange?.();
    }
  };

  const invalid = mode === "custom" && startHour >= endHour;

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
        <div className="absolute left-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1 shadow-2xl">
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
            <div className="mt-1 border-t border-[var(--color-border)] px-3 pb-1 pt-2">
              <div className="flex items-center gap-1.5">
                <HourSelect value={startHour} onChange={(v) => changeHour("start", v)} suffix=":00" />
                <span className="text-[var(--color-text-muted)]">–</span>
                <HourSelect value={endHour} onChange={(v) => changeHour("end", v)} suffix=":30" />
              </div>
              {invalid && <p className="mt-1.5 text-[11px] text-red-400">시작 시각이 종료보다 작아야 해요.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HourSelect({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-[12px] tabular-nums text-[var(--color-text-primary)]"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}
          {suffix}
        </option>
      ))}
    </select>
  );
}
