"use client";

/**
 * 시간표 그리드(page1) — 한눈에 전주. 요일 밴드 × 시간축, 학생별 블록(들쑥날쑥), 색=강사.
 * 실데이터 블록(per-enrollment)을 받아 렌더 — prop-driven.
 */

import { useMemo, useState } from "react";
import {
  axisOf,
  packDay,
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
  range,
}: {
  blocks: ViewBlock[];
  onBlockClick?: (blockId: string, anchor: DOMRect) => void;
  /** 운영시간(시) — 지정 시 시간축 고정. 미지정(auto/미설정) 시 데이터 자동맞춤(axisOf). */
  range?: { startHour: number; endHour: number };
}) {
  const [filter, setFilter] = useState<string | null>(null);

  // 과목 필터 (색 = 과목). subjectName → 대표 색.
  const subjects = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of blocks) if (!m.has(b.subjectName)) m.set(b.subjectName, b.color);
    return Array.from(m, ([name, color]) => ({ name, color }));
  }, [blocks]);
  const shown = useMemo(
    () => (filter ? blocks.filter((b) => b.subjectName === filter) : blocks),
    [blocks, filter]
  );
  const axis = useMemo(
    () =>
      range
        ? { start: range.startHour * 60, end: range.endHour * 60 }
        : axisOf(shown),
    [shown, range],
  );
  const span = Math.max(axis.end - axis.start, 60);
  const pct = (m: number) => ((m - axis.start) / span) * 100;
  // 운영시간 창과 겹치는 블록만 — 창 밖 블록이 left 음수가 되어 요일 라벨 칸을 덮는 것 방지.
  const visible = useMemo(
    () => shown.filter((b) => b.end > axis.start && b.start < axis.end),
    [shown, axis.start, axis.end]
  );
  const days = useMemo(
    () => Array.from(new Set(visible.map((b) => b.weekday))).sort((a, b) => a - b),
    [visible]
  );
  const hourTicks: number[] = [];
  for (let h = Math.ceil(axis.start / 60); h <= Math.floor(axis.end / 60); h++) hourTicks.push(h);

  return (
    <div>
      {subjects.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs">
          <span className="text-[var(--color-text-muted)]">과목 필터</span>
          <button
            onClick={() => setFilter(null)}
            className={`rounded-md px-2 py-0.5 transition ${!filter ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
          >
            전체
          </button>
          {subjects.map((s) => (
            <button
              key={s.name}
              onClick={() => setFilter(s.name)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 transition ${filter === s.name ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
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
          const { items, lanes } = packDay(visible.filter((b) => b.weekday === day));
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
                    onClick={(e) => onBlockClick?.(b.id, e.currentTarget.getBoundingClientRect())}
                    className="absolute flex h-[20px] items-center overflow-hidden rounded border px-1 text-[10px] font-semibold whitespace-nowrap transition hover:ring-2 hover:ring-white/70"
                    style={{
                      top: b.lane * LANE_H + 3,
                      left: `${Math.max(0, pct(b.start))}%`,
                      width: `${Math.max(Math.min(100, pct(b.end)) - Math.max(0, pct(b.start)), 4)}%`,
                      backgroundColor: b.color,
                      borderColor: b.color,
                      color: "#ffffff", // 항상 흰 글씨(C2, 2026-06-01 사용자 픽) — 일관성
                    }}
                    title={`${b.subjectName} ${b.studentName} ${fmt(b.start)}–${fmt(b.end)}${b.teacherName ? ` · ${b.teacherName}` : ""} (클릭: 편집)`}
                  >
                    {/* M4 과목 인셋 배지(2026-06-01 픽) — 과목을 살짝 어두운 칩으로 묶어 학생명과 구분 */}
                    <span className="rounded-[3px] bg-black/20 px-1 font-medium">{b.subjectName}</span>
                    <span className="pl-1">{b.studentName}</span>
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
