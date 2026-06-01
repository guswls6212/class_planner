"use client";

/**
 * 시간표 그리드(page1) — 한눈에 전주. 요일 밴드 × 시간축, 학생별 블록(들쑥날쑥), 색=강사.
 * 실데이터 블록(per-enrollment)을 받아 렌더 — prop-driven.
 */

import { useMemo, useState } from "react";
import {
  axisOf,
  packDay,
  readableText,
  weekdayLabel,
  type ViewBlock,
} from "../_data/scheduleViewModel";

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const LANE_H = 24;

export default function StudyRoomGrid({
  blocks,
  onBlockClick,
}: {
  blocks: ViewBlock[];
  onBlockClick?: (blockId: string) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);

  const teachers = useMemo(
    () => Array.from(new Set(blocks.map((b) => b.teacherName).filter((n): n is string => !!n))),
    [blocks]
  );
  const shown = useMemo(
    () => (filter ? blocks.filter((b) => b.teacherName === filter) : blocks),
    [blocks, filter]
  );
  const axis = useMemo(() => axisOf(shown), [shown]);
  const span = Math.max(axis.end - axis.start, 60);
  const pct = (m: number) => ((m - axis.start) / span) * 100;
  const days = useMemo(
    () => Array.from(new Set(shown.map((b) => b.weekday))).sort((a, b) => a - b),
    [shown]
  );
  const hourTicks: number[] = [];
  for (let h = Math.ceil(axis.start / 60); h <= Math.floor(axis.end / 60); h++) hourTicks.push(h);

  return (
    <div>
      {teachers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs">
          <span className="text-[var(--color-text-muted)]">강사 필터</span>
          <button
            onClick={() => setFilter(null)}
            className={`rounded-md px-2 py-0.5 transition ${!filter ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
          >
            전체
          </button>
          {teachers.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-md px-2 py-0.5 transition ${filter === t ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 시간 눈금 */}
      <div className="flex">
        <div className="w-8 shrink-0" />
        <div className="relative ml-1 h-5 grow text-[10px] text-[var(--color-text-muted)]">
          {hourTicks.map((h) => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>
              {h}시
            </span>
          ))}
        </div>
      </div>

      {/* 요일 밴드 */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        {days.map((day, di) => {
          const { items, lanes } = packDay(shown.filter((b) => b.weekday === day));
          const h = lanes * LANE_H + 6;
          return (
            <div key={day} className={`flex ${di > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
              <div className="flex w-8 shrink-0 items-center justify-center border-r border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)]">
                {weekdayLabel(day)}
              </div>
              <div className="relative ml-1 grow" style={{ height: h }}>
                {hourTicks.map((hr) => (
                  <span
                    key={hr}
                    className="absolute top-0 h-full w-px bg-[var(--color-border)] opacity-40"
                    style={{ left: `${pct(hr * 60)}%` }}
                  />
                ))}
                {items.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => onBlockClick?.(b.id)}
                    className="absolute flex h-[20px] items-center overflow-hidden rounded border px-1 text-[10px] font-semibold whitespace-nowrap transition hover:ring-2 hover:ring-white/70"
                    style={{
                      top: b.lane * LANE_H + 3,
                      left: `${pct(b.start)}%`,
                      width: `${Math.max(pct(b.end) - pct(b.start), 5)}%`,
                      backgroundColor: b.color,
                      borderColor: b.color,
                      color: readableText(b.color),
                    }}
                    title={`${b.subjectName} ${b.studentName} ${fmt(b.start)}–${fmt(b.end)}${b.teacherName ? ` · ${b.teacherName}` : ""} (클릭: 편집)`}
                  >
                    {b.subjectName} {b.studentName}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
