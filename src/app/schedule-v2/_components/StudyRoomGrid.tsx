"use client";

/**
 * 시간표 그리드(page1) — 한눈에 전주. 요일 밴드 × 시간축, 학생별 블록(들쑥날쑥), 색=강사, 비고 inline.
 * class-planner의 세션블록(학생 공유 시작·끝) 대신 per-student 블록 렌더 → 공부방 방식과 일치.
 */

import { useMemo, useState } from "react";
import {
  SAMPLE_STUDENTS,
  WEEKDAYS,
  DAY_NOTE,
  SUBJECT_TEACHER,
  dayGridBlocks,
  gridAxis,
} from "../_data/sampleSchedule";
import { TONE_BLOCK, TONE_DOT, toneOf } from "./subjectTone";

const LANE_H = 24;
const TEACHERS = ["김쌤", "이쌤", "박쌤", "정쌤"];

function fmt12(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, "0")}`;
}

export default function StudyRoomGrid() {
  const [filter, setFilter] = useState<string | null>(null);

  const axis = useMemo(() => gridAxis(SAMPLE_STUDENTS, filter), [filter]);
  const span = Math.max(axis.end - axis.start, 60);
  const pct = (m: number) => ((m - axis.start) / span) * 100;
  const hourTicks: number[] = [];
  for (let h = Math.ceil(axis.start / 60); h <= Math.floor(axis.end / 60); h++) hourTicks.push(h);

  return (
    <div>
      {/* 강사 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs">
        <span className="text-[var(--color-text-muted)]">강사 필터</span>
        <button
          onClick={() => setFilter(null)}
          className={`rounded-md px-2 py-0.5 transition ${!filter ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
        >
          전체
        </button>
        {TEACHERS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-md px-2 py-0.5 transition ${filter === t ? "bg-[var(--color-accent)] text-black" : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:opacity-80"}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-[var(--color-text-muted)]">엑셀과 다른 점(점진 추가): 블록 드래그 · 하교 바꾸면 자동 시프트</span>
      </div>

      {/* 시간 눈금 */}
      <div className="flex">
        <div className="w-8 shrink-0" />
        <div className="relative ml-1 h-5 grow text-[10px] text-[var(--color-text-muted)]">
          {hourTicks.map((h) => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>
              {h > 12 ? h - 12 : h}시
            </span>
          ))}
        </div>
        <div className="w-32 shrink-0 pl-2 text-[10px] font-medium text-[var(--color-text-muted)]">비고</div>
      </div>

      {/* 요일 밴드 */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        {WEEKDAYS.map((day, di) => {
          const { blocks, lanes } = dayGridBlocks(SAMPLE_STUDENTS, day, filter);
          const h = lanes * LANE_H + 6;
          return (
            <div key={day} className={`flex ${di > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
              <div className="flex w-8 shrink-0 items-center justify-center border-r border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)]">
                {day}
              </div>
              <div className="relative ml-1 grow" style={{ height: h }}>
                {hourTicks.map((hr) => (
                  <span key={hr} className="absolute top-0 h-full w-px bg-[var(--color-border)] opacity-40" style={{ left: `${pct(hr * 60)}%` }} />
                ))}
                {blocks.map((b, i) => (
                  <div
                    key={i}
                    className={`absolute flex h-[20px] items-center overflow-hidden rounded border px-1 text-[10px] font-semibold whitespace-nowrap ${TONE_BLOCK[toneOf(b.subj)]}`}
                    style={{ top: b.lane * LANE_H + 3, left: `${pct(b.start)}%`, width: `${Math.max(pct(b.end) - pct(b.start), 5)}%` }}
                    title={`${b.subj} ${b.name} ${fmt12(b.start)}–${fmt12(b.end)} · ${SUBJECT_TEACHER[b.subj]}`}
                  >
                    {b.subj} {b.name}
                  </div>
                ))}
              </div>
              <div className="flex w-32 shrink-0 items-center border-l border-[var(--color-border)] px-2 text-[10px] text-[var(--color-accent)]">
                {DAY_NOTE[day]}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text-muted)]">강사:</span>
        {Object.entries(SUBJECT_TEACHER).map(([subj, teacher]) => (
          <span key={subj} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[toneOf(subj)]}`} />
            {teacher} <span className="text-[var(--color-text-muted)]">({subj})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
