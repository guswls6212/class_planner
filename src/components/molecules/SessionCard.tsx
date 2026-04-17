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

function SessionCardRow(_props: SessionCardProps) {
  return <div data-testid="session-card-row">TODO</div>;
}

function SessionCardChip(_props: SessionCardProps) {
  return <div data-testid="session-card-chip">TODO</div>;
}

function SessionCardPreview(_props: SessionCardProps) {
  return <div data-testid="session-card-preview">TODO</div>;
}

export default SessionCard;
