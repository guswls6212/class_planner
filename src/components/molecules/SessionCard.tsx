"use client";

import React from "react";
import type { SessionCardProps } from "./SessionCard.types";
import { resolveSessionTone } from "./SessionCard.utils";

export function SessionCard(props: SessionCardProps) {
  const { variant } = props;
  if (variant === "block") return <SessionCardBlock {...props} />;
  if (variant === "row") return <SessionCardRow {...props} />;
  if (variant === "chip") return <SessionCardChip {...props} />;
  return <SessionCardPreview {...props} />;
}

function SessionCardBlock({
  subject,
  studentNames,
  state = "default",
  style,
  onClick,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "과목 없음";
  const subLabel =
    studentNames && studentNames.length > 0
      ? studentNames.join(", ")
      : undefined;

  const cardStyle: React.CSSProperties = {
    ...style,
    backgroundColor: tone.bg,
    color: tone.fg,
    borderLeft:
      state === "ongoing" || state === "conflict"
        ? `3px solid ${state === "conflict" ? "#EF4444" : tone.accent}`
        : undefined,
    opacity: state === "done" ? 0.55 : undefined,
  };

  const ariaLabel = state === "conflict" ? `${label} — 시간 충돌` : label;

  const baseClass = [
    "relative rounded-[4px] px-2 py-1 text-[11px] leading-tight overflow-hidden text-left",
    "transition-shadow hover:shadow-md",
    onClick ? "cursor-pointer" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="font-semibold truncate">{label}</div>
      {subLabel && (
        <div className="text-[10px] opacity-75 truncate">{subLabel}</div>
      )}
      {state === "conflict" && (
        <span
          className="absolute top-0.5 right-1 text-[10px] text-[#EF4444]"
          aria-hidden
        >
          ⚠
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        style={cardStyle}
        data-testid={testId}
        data-state={state}
        data-variant="block"
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className={baseClass}
      style={cardStyle}
      data-testid={testId}
      data-state={state}
      data-variant="block"
      aria-label={ariaLabel}
    >
      {content}
    </div>
  );
}

const ATTENDANCE_LABELS: Record<string, string> = {
  "all-present": "✓",
  partial: "△",
  absent: "✗",
  unmarked: "•",
};

const ATTENDANCE_COLORS: Record<string, string> = {
  "all-present": "bg-green-500",
  partial: "bg-yellow-400",
  absent: "bg-red-400",
  unmarked: "bg-[var(--color-text-muted)]",
};

function SessionCardRow({
  subject,
  studentNames,
  timeRange,
  state = "default",
  onClick,
  onAttendanceClick,
  attendanceStatus = "unmarked",
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "과목 없음";
  const students =
    studentNames && studentNames.length > 0
      ? studentNames.join(", ")
      : undefined;

  return (
    <div
      className={["flex items-center gap-2 w-full", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      data-variant="row"
      data-state={state}
    >
      {timeRange && (
        <span className="text-[11px] text-[var(--color-text-muted)] w-10 flex-shrink-0 text-right">
          {timeRange}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex-1 min-w-0 rounded-[4px] px-2 py-1.5 text-left transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: tone.bg,
          color: tone.fg,
          borderLeft:
            state === "ongoing" ? `3px solid ${tone.accent}` : undefined,
          opacity: state === "done" ? 0.55 : undefined,
        }}
      >
        <div className="text-[12px] font-semibold truncate">{label}</div>
        {students && (
          <div className="text-[10px] opacity-75 truncate">{students}</div>
        )}
      </button>
      {onAttendanceClick && (
        <button
          type="button"
          onClick={onAttendanceClick}
          aria-label="출석 체크"
          className="flex-shrink-0 flex flex-col items-center gap-0.5"
        >
          <span
            className={[
              "w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center",
              ATTENDANCE_COLORS[attendanceStatus],
            ].join(" ")}
          >
            {ATTENDANCE_LABELS[attendanceStatus]}
          </span>
          <span className="text-[9px] text-[var(--color-text-muted)]">
            출석
          </span>
        </button>
      )}
    </div>
  );
}

function SessionCardChip({
  subject,
  state = "default",
  onClick,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "수업";

  const baseClass = [
    "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium truncate w-full text-left",
    onClick ? "cursor-pointer hover:opacity-90" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const toneStyle: React.CSSProperties = {
    backgroundColor: tone.bg,
    color: tone.fg,
    opacity: state === "done" ? 0.55 : undefined,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        style={toneStyle}
        data-testid={testId}
        data-variant="chip"
        data-state={state}
      >
        {label}
      </button>
    );
  }
  return (
    <div
      className={baseClass}
      style={toneStyle}
      data-testid={testId}
      data-variant="chip"
      data-state={state}
    >
      {label}
    </div>
  );
}

function SessionCardPreview({
  subject,
  studentNames,
  style,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "수업";
  const subLabel =
    studentNames && studentNames.length > 0
      ? studentNames.join(", ")
      : undefined;

  return (
    <div
      className={[
        "rounded-[4px] px-2 py-1 text-[10px] leading-tight overflow-hidden pointer-events-none",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        backgroundColor: tone.bg,
        color: tone.fg,
      }}
      data-testid={testId}
      data-variant="preview"
      aria-hidden="true"
    >
      <div className="font-semibold truncate">{label}</div>
      {subLabel && (
        <div className="text-[9px] opacity-75 truncate">{subLabel}</div>
      )}
    </div>
  );
}

export default SessionCard;
