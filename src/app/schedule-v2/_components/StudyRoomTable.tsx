"use client";

/**
 * 학생별 표(page2) — 친구 PDF 페이지2 구조. 학생마다 *수업 있는 요일만* 표시(빈 요일 제거 → 칸 넓게).
 * 디자인(2026-06-01 픽): D 베이스(셀 = 과목색 시간블록) + 학생명·과목은 C 스타일
 *   (학생명 = accent chip, 과목 = 과목색 라벨·전체 이름). 색 = 과목.
 */

import { Fragment } from "react";
import { weekdayLabel, type TableStudent } from "../_data/scheduleViewModel";

function StudentCard({ s }: { s: TableStudent }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
      {/* 학생 이름 — C 스타일 chip */}
      {/* 학생 이름 — C 스타일: 좌측 accent 바 + 흰 이름(노랑 과다 회피, 이름은 흰색) */}
      <div className="mb-2.5 flex items-center gap-2 text-[14px] font-bold text-[var(--color-text-primary)]">
        <span className="h-4 w-1 rounded-full bg-[var(--color-accent)]" />
        {s.name}
      </div>

      {/* D 베이스 grid: 과목 col(auto) + 학생 active 요일. 셀 = 과목색 시간블록 */}
      <div
        className="grid items-center gap-x-1.5 gap-y-1"
        style={{ gridTemplateColumns: `auto repeat(${s.weekdays.length}, minmax(0, 1fr))` }}
      >
        <div />
        {s.weekdays.map((d) => (
          // W2 요일 칩 (2026-06-01 픽) — 작고 흐린 라벨 → 또렷한 pill 로 가독성 ↑
          <div key={d} className="flex justify-center">
            <span className="inline-block rounded-md bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-secondary)]">
              {weekdayLabel(d)}
            </span>
          </div>
        ))}

        {s.rows.map((r) => (
          <Fragment key={r.subject}>
            {/* 과목 — C 스타일 색 라벨, 전체 이름 */}
            <div className="pr-1 text-[11px] font-bold whitespace-nowrap" style={{ color: r.color }}>
              {r.subject}
            </div>
            {s.weekdays.map((d) => {
              const t = r.times[d];
              return (
                <div key={d} className="text-center">
                  {t ? (
                    <span
                      className="block py-1 text-[10px] font-medium leading-tight tabular-nums text-[var(--color-text-primary)]"
                      title={t}
                    >
                      {t}
                    </span>
                  ) : (
                    <span className="block py-1 text-[10px] text-[var(--color-text-muted)] opacity-25">·</span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function StudyRoomTable({ students }: { students: TableStudent[] }) {
  const left = students.filter((_, i) => i % 2 === 0);
  const right = students.filter((_, i) => i % 2 === 1);

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <div className="grid gap-3">
        {left.map((s) => (
          <StudentCard key={s.id} s={s} />
        ))}
      </div>
      <div className="grid gap-3">
        {right.map((s) => (
          <StudentCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}
