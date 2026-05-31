"use client";

/**
 * 학생별 표(page2) — 학생마다 과목 × 요일 시간. 그리드(page1)와 같은 데이터의 다른 뷰.
 * 실데이터(TableStudent[])를 받아 렌더 — prop-driven.
 */

import { useState } from "react";
import { weekdayLabel, type TableStudent } from "../_data/scheduleViewModel";

function StudentCard({
  s,
  active,
  onHover,
}: {
  s: TableStudent;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-xl border bg-[var(--color-bg-secondary)] p-2.5 transition ${active ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1 text-left text-[12px] font-bold text-[var(--color-text-primary)]">
              {s.name}
            </th>
            {s.weekdays.map((d) => (
              <th key={d} className="px-1 py-1 text-center text-[11px] font-semibold text-[var(--color-text-muted)]">
                {weekdayLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.subject}>
              <td className="py-0.5 pr-1.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.subject}
                </span>
              </td>
              {s.weekdays.map((d) => (
                <td key={d} className="p-0.5">
                  <div
                    className={`rounded border px-1 py-1 text-center text-[10px] ${
                      r.times[d]
                        ? "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                        : "border-transparent text-[var(--color-text-muted)] opacity-40"
                    }`}
                  >
                    {r.times[d] ?? "·"}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StudyRoomTable({ students }: { students: TableStudent[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const left = students.filter((_, i) => i % 2 === 0);
  const right = students.filter((_, i) => i % 2 === 1);

  return (
    <div className="grid items-start gap-2.5 lg:grid-cols-2">
      <div className="grid gap-2.5">
        {left.map((s) => (
          <StudentCard key={s.id} s={s} active={hover === s.id} onHover={setHover} />
        ))}
      </div>
      <div className="grid gap-2.5">
        {right.map((s) => (
          <StudentCard key={s.id} s={s} active={hover === s.id} onHover={setHover} />
        ))}
      </div>
    </div>
  );
}
