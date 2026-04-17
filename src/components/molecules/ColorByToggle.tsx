"use client";
import SegmentedButton from "@/components/atoms/SegmentedButton";
import type { ColorByMode } from "@/hooks/useColorBy";

interface ColorByToggleProps {
  colorBy: ColorByMode;
  onChange: (mode: ColorByMode) => void;
}

const MODES = [
  { label: "과목", value: "subject" as ColorByMode },
  { label: "학생", value: "student" as ColorByMode },
  { label: "강사", value: "teacher" as ColorByMode },
] as const;

export default function ColorByToggle({ colorBy, onChange }: ColorByToggleProps) {
  return (
    <SegmentedButton
      options={MODES}
      value={colorBy}
      onChange={onChange}
      aria-label="색상 기준"
    />
  );
}
