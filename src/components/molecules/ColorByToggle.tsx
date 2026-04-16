"use client";
import React from "react";
import type { ColorByMode } from "../../hooks/useColorBy";

interface ColorByToggleProps {
  colorBy: ColorByMode;
  onChange: (mode: ColorByMode) => void;
}

const MODES: { label: string; value: ColorByMode }[] = [
  { label: "과목", value: "subject" },
  { label: "학생", value: "student" },
  { label: "강사", value: "teacher" },
];

export default function ColorByToggle({ colorBy, onChange }: ColorByToggleProps) {
  return (
    <div
      role="group"
      aria-label="색상 기준"
      className="flex rounded-lg border border-[--color-border] bg-[--color-bg-secondary] p-0.5"
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={colorBy === mode.value}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors duration-150 ${
            colorBy === mode.value
              ? "bg-[--color-primary] text-white shadow-sm"
              : "text-[--color-text-secondary] hover:text-[--color-text-primary]"
          }`}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
