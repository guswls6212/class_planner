"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import {
  resolveTimeRange,
  writeStoredRange,
  type TimeRangeMode,
} from "../../hooks/useTimeRange";

export interface OperatingHoursSectionProps {
  userId: string | null;
}

const MODE_OPTIONS: { value: TimeRangeMode; label: string; desc: string }[] = [
  {
    value: "default",
    label: "기본 (9시 ~ 23시)",
    desc: "표준 학원 운영 시간. 9시부터 23:30까지 표시",
  },
  {
    value: "auto",
    label: "자동 (데이터 기반)",
    desc: "수업 데이터의 시작·종료 시간 ± 1시간 자동 조정",
  },
  {
    value: "custom",
    label: "사용자 지정",
    desc: "원하는 시작·종료 시각 직접 설정",
  },
];

export default function OperatingHoursSection({
  userId,
}: OperatingHoursSectionProps) {
  const [mode, setMode] = useState<TimeRangeMode>("default");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);

  useEffect(() => {
    const initial = resolveTimeRange({
      queryValue: null,
      sessions: [],
      userId,
    });
    setMode(initial.mode);
    setStartHour(initial.startHour);
    setEndHour(initial.endHour);
  }, [userId]);

  const handleModeChange = (newMode: TimeRangeMode) => {
    setMode(newMode);
    if (newMode === "custom") {
      writeStoredRange(userId, { mode: "custom", startHour, endHour });
    } else {
      writeStoredRange(userId, { mode: newMode });
    }
  };

  const handleStartChange = (value: number) => {
    setStartHour(value);
    if (mode === "custom" && value < endHour) {
      writeStoredRange(userId, {
        mode: "custom",
        startHour: value,
        endHour,
      });
    }
  };

  const handleEndChange = (value: number) => {
    setEndHour(value);
    if (mode === "custom" && startHour < value) {
      writeStoredRange(userId, {
        mode: "custom",
        startHour,
        endHour: value,
      });
    }
  };

  const isInvalidRange = mode === "custom" && startHour >= endHour;

  return (
    <section
      data-testid="operating-hours-section"
      className="bg-[var(--color-bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--color-border)]"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
        <Clock size={18} aria-hidden="true" />
        시간표 운영시간
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        시간표 grid + PDF 출력에 적용됩니다. 학원 운영 패턴에 맞춰 조정하세요.
        변경사항은 자동 저장됩니다.
      </p>

      <div className="space-y-2">
        {MODE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === opt.value
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-border-light)]"
            }`}
          >
            <input
              type="radio"
              name="time-range-mode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => handleModeChange(opt.value)}
              className="mt-0.5 accent-[var(--color-accent)]"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {opt.label}
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {opt.desc}
              </div>
            </div>
          </label>
        ))}
      </div>

      {mode === "custom" && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                시작 시각
              </label>
              <select
                value={startHour}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[var(--color-text-muted)] pb-1.5">—</span>
            <div className="flex-1">
              <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                종료 시각 (해당 시각 30분까지 표시)
              </label>
              <select
                value={endHour}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, "0")}:30
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isInvalidRange && (
            <p className="mt-2 text-xs text-red-400">
              시작 시각이 종료 시각보다 작아야 합니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
