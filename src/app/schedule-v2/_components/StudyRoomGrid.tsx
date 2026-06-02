"use client";

/**
 * 시간표 그리드(page1) — 한눈에 전주. 요일 밴드 × 시간축, 학생별 블록(들쑥날쑥), 색=과목.
 * 실데이터 블록(per-enrollment)을 받아 렌더 — prop-driven.
 *
 * 가독성(2026-06-02, mockup grid-block-readability — S1+S3 픽):
 *   - 고정 px/시 스케일(gridGeometry) → 학생이름(최대 6자) 풀표시. 운영시간이 길어 트랙이
 *     컨테이너를 넘으면 가로 스크롤(요일 라벨은 sticky 고정으로 항상 보임).
 *   - 모바일(≤767px): 과목 숨김(이름만)으로 좁은 폭에 이름 확보. 색=과목은 상단 과목필터가 범례.
 * SSR-safe: useHasMounted 게이트로 첫 렌더는 데스크톱(과목+이름) → mount 후 모바일 반영
 *   (useMediaQuery 초기값 ↔ 서버 렌더 hydration mismatch 회피).
 */

import { useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useHasMounted } from "@/hooks/useHasMounted";
import { packDay, weekdayLabel, type ViewBlock } from "../_data/scheduleViewModel";
import {
  GRID_LABEL_W,
  GRID_LANE_H,
  blockGeometry,
  hourTicks,
  pxPerMinute,
  resolveAxis,
  showSubjectLabel,
  trackWidthPx,
} from "../_data/gridGeometry";

function fmt(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

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
  // 모바일 감지 — 첫 렌더(SSR+hydration)는 false(데스크톱)로 고정해 mismatch 회피, mount 후 반영.
  const mounted = useHasMounted();
  const isMobile = useMediaQuery("(max-width: 767px)") && mounted;
  const pxPerMin = pxPerMinute(isMobile);
  const withSubject = showSubjectLabel(isMobile);

  // 과목 필터 (색 = 과목). subjectName → 대표 색. 모바일에선 이 줄이 색=과목 범례 역할.
  const subjects = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of blocks) if (!m.has(b.subjectName)) m.set(b.subjectName, b.color);
    return Array.from(m, ([name, color]) => ({ name, color }));
  }, [blocks]);
  const shown = useMemo(
    () => (filter ? blocks.filter((b) => b.subjectName === filter) : blocks),
    [blocks, filter]
  );
  const axis = useMemo(() => resolveAxis(shown, range), [shown, range]);
  const trackW = trackWidthPx(axis, pxPerMin);
  const ticks = useMemo(() => hourTicks(axis), [axis]);
  // 운영시간 창과 겹치는 블록만 — 창 밖 블록이 라벨 칸을 덮는 것 방지.
  const visible = useMemo(
    () => shown.filter((b) => b.end > axis.start && b.start < axis.end),
    [shown, axis.start, axis.end]
  );
  const days = useMemo(
    () => Array.from(new Set(visible.map((b) => b.weekday))).sort((a, b) => a - b),
    [visible]
  );
  const tickLeft = (h: number) => (h * 60 - axis.start) * pxPerMin;

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

      {/* 가로 스크롤 컨테이너 — 시간축이 컨테이너보다 넓으면 스크롤, 요일 라벨은 sticky 고정. */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <div style={{ width: GRID_LABEL_W + trackW, minWidth: "100%" }}>
          {/* 시간 눈금 */}
          <div className="flex">
            <div
              className="sticky left-0 z-20 shrink-0 bg-[var(--color-bg-primary)]"
              style={{ width: GRID_LABEL_W }}
            />
            <div
              className="relative h-5 text-[10px] text-[var(--color-text-muted)]"
              style={{ width: trackW }}
            >
              {ticks.map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: tickLeft(h) }}>
                  {h}시
                </span>
              ))}
            </div>
          </div>

          {/* 요일 밴드 */}
          {days.map((day, di) => {
            const { items, lanes } = packDay(visible.filter((b) => b.weekday === day));
            const h = lanes * GRID_LANE_H + 6;
            return (
              <div key={day} className={`flex ${di > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm font-bold text-[var(--color-text-secondary)]"
                  style={{ width: GRID_LABEL_W }}
                >
                  {weekdayLabel(day)}
                </div>
                <div className="relative" style={{ width: trackW, height: h }}>
                  {ticks.map((hr) => (
                    <span
                      key={hr}
                      className="absolute top-0 h-full w-px bg-[var(--color-border)] opacity-40"
                      style={{ left: tickLeft(hr) }}
                    />
                  ))}
                  {items.map((b) => {
                    const { left, width } = blockGeometry(b, axis, pxPerMin);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={(e) => onBlockClick?.(b.id, e.currentTarget.getBoundingClientRect())}
                        className="absolute flex h-[20px] items-center overflow-hidden rounded border px-1 text-[10px] font-semibold whitespace-nowrap transition hover:ring-2 hover:ring-white/70"
                        style={{
                          top: b.lane * GRID_LANE_H + 3,
                          left,
                          width,
                          backgroundColor: b.color,
                          borderColor: b.color,
                          color: "#ffffff", // 항상 흰 글씨(C2, 2026-06-01 사용자 픽) — 일관성
                        }}
                        title={`${b.subjectName} ${b.studentName} ${fmt(b.start)}–${fmt(b.end)}${b.teacherName ? ` · ${b.teacherName}` : ""} (클릭: 편집)`}
                      >
                        {/* 데스크톱: 과목 인셋 배지 + 이름. 모바일(S3): 과목 숨기고 이름만. */}
                        {withSubject && (
                          <span className="rounded-[3px] bg-black/20 px-1 font-medium">{b.subjectName}</span>
                        )}
                        <span className={withSubject ? "pl-1" : ""}>{b.studentName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
