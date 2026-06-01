"use client";

import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Select } from "@/components/atoms/Select";
import {
  readStoredRange,
  resolveTimeRange,
  writeStoredRange,
  type TimeRangeMode,
} from "../../hooks/useTimeRange";

export interface OperatingHoursSectionProps {
  userId: string | null;
  /** 저장(writeStoredRange) 직후 호출 — 호출측이 grid 등을 즉시 갱신할 수 있게. */
  onChange?: () => void;
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

function describeSummary(
  mode: TimeRangeMode,
  startHour: number,
  endHour: number,
): string {
  if (mode === "default") return "기본 9 - 23시";
  if (mode === "auto") return "자동 (데이터 기반)";
  return `${startHour} - ${endHour}시 (사용자 지정)`;
}

export default function OperatingHoursSection({
  userId,
  onChange,
}: OperatingHoursSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<TimeRangeMode>("default");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);

  useEffect(() => {
    const initial = resolveTimeRange({
      queryValue: null,
      sessions: [],
      stored: readStoredRange(userId),
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
    onChange?.();
  };

  const handleStartChange = (value: number) => {
    setStartHour(value);
    if (mode === "custom" && value < endHour) {
      writeStoredRange(userId, { mode: "custom", startHour: value, endHour });
    }
    onChange?.();
  };

  const handleEndChange = (value: number) => {
    setEndHour(value);
    if (mode === "custom" && startHour < value) {
      writeStoredRange(userId, { mode: "custom", startHour, endHour: value });
    }
    onChange?.();
  };

  const isInvalidRange = mode === "custom" && startHour >= endHour;
  const summary = describeSummary(mode, startHour, endHour);

  return (
    <section
      data-testid="operating-hours-section"
      className="bg-[var(--color-bg-secondary)] rounded-xl mt-4 border border-[var(--color-border)] overflow-hidden"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="w-full flex items-start justify-between gap-3 p-5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-t-xl"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Clock size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              시간표 운영시간{" "}
              <span className="text-[11px] font-normal text-[var(--color-text-muted)] ml-1">
                {summary}
              </span>
            </h2>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
              시간표 grid + PDF 출력에 적용. 학원 운영 패턴에 맞춰 조정
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {expanded ? (
            <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] space-y-2">
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

          {mode === "custom" && (
            <div className="pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                    시작 시각
                  </label>
                  <Select
                    size="sm"
                    value={startHour}
                    onChange={(e) => handleStartChange(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </Select>
                </div>
                <span className="text-[var(--color-text-muted)] pb-1.5">—</span>
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--color-text-muted)] mb-1">
                    종료 시각 (해당 시 30분까지 표시)
                  </label>
                  <Select
                    size="sm"
                    value={endHour}
                    onChange={(e) => handleEndChange(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, "0")}:30
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {isInvalidRange && (
                <p className="mt-2 text-xs text-red-400">
                  시작 시각이 종료 시각보다 작아야 합니다.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
