"use client";

/**
 * 학생별 표(page2) — 학생마다 과목 × 요일 시간. 그리드(page1)와 같은 데이터의 다른 뷰.
 * 학생마다 요일·과목이 다름(주말 학생 포함) = 친구 page2 그대로.
 */

import { useState } from "react";
import { SAMPLE_STUDENTS, SUBJECT_TEACHER, type Student } from "../_data/sampleSchedule";
import { TONE_DOT, toneOf } from "./subjectTone";

function StudentCard({
  s,
  active,
  onHover,
}: {
  s: Student;
  active: boolean;
  onHover: (n: string | null) => void;
}) {
  return (
    <div
      onMouseEnter={() => onHover(s.name)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-xl border bg-[var(--color-bg-secondary)] p-2.5 transition ${active ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"}`}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1 text-left text-[12px] font-bold text-[var(--color-text-primary)]">
              {s.name}
            </th>
            {s.days.map((d) => (
              <th key={d} className="px-1 py-1 text-center text-[11px] font-semibold text-[var(--color-text-muted)]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map((r) => (
            <tr key={r.subj}>
              <td className="py-0.5 pr-1.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  <span className={`h-2 w-2 rounded-full ${TONE_DOT[toneOf(r.subj)]}`} />
                  {r.subj}
                </span>
              </td>
              {s.days.map((d) => (
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

export default function StudyRoomTable() {
  const [hover, setHover] = useState<string | null>(null);
  const left = SAMPLE_STUDENTS.filter((_, i) => i % 2 === 0);
  const right = SAMPLE_STUDENTS.filter((_, i) => i % 2 === 1);

  return (
    <div>
      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        <div className="grid gap-2.5">
          {left.map((s) => (
            <StudentCard key={s.name} s={s} active={hover === s.name} onHover={setHover} />
          ))}
        </div>
        <div className="grid gap-2.5">
          {right.map((s) => (
            <StudentCard key={s.name} s={s} active={hover === s.name} onHover={setHover} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[var(--color-text-secondary)]">
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
