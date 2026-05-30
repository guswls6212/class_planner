"use client";

import {
  MOCK_SESSIONS,
  WEEKDAY_LABELS,
  type MockSession,
} from "./data";

const SLOT_HEIGHT = 32;

interface MockGridProps {
  startHour?: number;
  endHour?: number;
  selectedStudents?: string[];
}

export default function MockGrid({
  startHour = 9,
  endHour = 23,
  selectedStudents = [],
}: MockGridProps) {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const slotCount = hours.length * 2;
  const contentHeight = slotCount * SLOT_HEIGHT;

  const visibleSessions: MockSession[] = MOCK_SESSIONS.filter((s) => {
    if (s.startHour < startHour) return false;
    if (s.endHour > endHour + 1) return false;
    if (selectedStudents.length === 0) return true;
    return s.students.some((name) =>
      selectedStudents.some((id) => `s${selectedStudents.indexOf(id) + 1}` === id),
    );
  });

  function topPx(s: MockSession): number {
    const minSinceStart = (s.startHour - startHour) * 60 + s.startMin;
    return (minSinceStart / 30) * SLOT_HEIGHT;
  }
  function heightPx(s: MockSession): number {
    const dur =
      (s.endHour - s.startHour) * 60 + (s.endMin - s.startMin);
    return (dur / 30) * SLOT_HEIGHT - 2;
  }

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
      {/* 시간 라벨 column */}
      <div className="border-r border-[var(--color-border)]">
        <div className="h-12 border-b border-[var(--color-border)]" />
        {hours.map((h) => (
          <div
            key={h}
            style={{ height: SLOT_HEIGHT * 2 }}
            className="border-b border-[var(--color-border)] flex items-start justify-end pr-1.5 pt-0.5 text-[10px] text-[var(--color-text-muted)]"
          >
            {h.toString().padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* 요일 columns */}
      {WEEKDAY_LABELS.map((label, wd) => (
        <div
          key={wd}
          className="border-r border-[var(--color-border)] last:border-r-0 relative"
        >
          <div className="h-12 border-b border-[var(--color-border)] flex flex-col items-center justify-center text-xs">
            <span className="text-[var(--color-text-muted)]">{label}</span>
            <span className="font-bold">{4 + wd}</span>
          </div>
          <div
            className="relative"
            style={{ height: contentHeight }}
          >
            {Array.from({ length: slotCount }, (_, i) => (
              <div
                key={i}
                className="border-b border-[var(--color-border)]/40"
                style={{ height: SLOT_HEIGHT }}
              />
            ))}
            {visibleSessions
              .filter((s) => s.weekday === wd)
              .map((s) => (
                <div
                  key={s.id}
                  className="absolute left-1 right-1 rounded p-1 text-[10px] leading-tight overflow-hidden shadow-sm"
                  style={{
                    top: topPx(s),
                    height: heightPx(s),
                    background: s.bg,
                    color: s.fg,
                  }}
                >
                  <div className="font-semibold">{s.subject}</div>
                  <div className="opacity-80">
                    {s.startHour.toString().padStart(2, "0")}:
                    {s.startMin.toString().padStart(2, "0")}-
                    {s.endHour.toString().padStart(2, "0")}:
                    {s.endMin.toString().padStart(2, "0")}
                  </div>
                  <div className="opacity-90">{s.students.join(", ")}</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
