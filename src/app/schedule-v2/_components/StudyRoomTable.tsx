"use client";

/**
 * 학생별 표(page2) — 학생마다 과목 × 요일 시간. 그리드(page1)와 같은 데이터의 다른 뷰.
 * 학생 이름은 카드 헤더(배경 구분), 과목·요일은 table-fixed 로 카드마다 폭 통일.
 * 셀은 시작 시간만(전체 범위는 title) — 고정 narrow 열에 맞춤. 색 = 과목.
 */

import { useMemo, useState } from "react";
import { weekdayLabel, type TableStudent } from "../_data/scheduleViewModel";

function StudentCard({
  s,
  days,
  active,
  onHover,
}: {
  s: TableStudent;
  days: number[];
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      className={`overflow-hidden rounded-xl border bg-[var(--color-bg-secondary)] transition ${
        active ? "border-[var(--color-accent)] shadow-md" : "border-[var(--color-border)]"
      }`}
    >
      {/* 학생 이름 헤더 — 배경 구분 + 이니셜 배지 */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-bold text-black">
          {s.name.slice(0, 1)}
        </span>
        <span className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{s.name}</span>
      </div>

      {/* 과목 × 요일 — table-fixed 로 폭 고정 */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[68px]" />
          {days.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-[var(--color-text-muted)]">
            <th className="px-2 py-1 text-left text-[10px] font-medium">과목</th>
            {days.map((d) => (
              <th key={d} className="px-0.5 py-1 text-center text-[10px] font-semibold">
                {weekdayLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.subject} className="border-t border-[var(--color-border)]">
              <td className="px-2 py-1">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="truncate">{r.subject}</span>
                </span>
              </td>
              {days.map((d) => {
                const range = r.times[d];
                return (
                  <td key={d} className="px-0.5 py-1 text-center" title={range ?? undefined}>
                    {range ? (
                      <span className="text-[10px] tabular-nums text-[var(--color-text-primary)]">
                        {range.split("-")[0]}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)] opacity-30">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudyRoomTable({ students }: { students: TableStudent[] }) {
  const [hover, setHover] = useState<string | null>(null);

  // 모든 학생 공통 요일 축(union) → 카드마다 열/폭 통일. 비면 월~금.
  const days = useMemo(() => {
    const set = new Set<number>();
    for (const s of students) for (const d of s.weekdays) set.add(d);
    const arr = Array.from(set).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [0, 1, 2, 3, 4];
  }, [students]);

  const left = students.filter((_, i) => i % 2 === 0);
  const right = students.filter((_, i) => i % 2 === 1);

  return (
    <div className="grid items-start gap-2.5 lg:grid-cols-2">
      <div className="grid gap-2.5">
        {left.map((s) => (
          <StudentCard key={s.id} s={s} days={days} active={hover === s.id} onHover={setHover} />
        ))}
      </div>
      <div className="grid gap-2.5">
        {right.map((s) => (
          <StudentCard key={s.id} s={s} days={days} active={hover === s.id} onHover={setHover} />
        ))}
      </div>
    </div>
  );
}
