"use client";
import SegmentedButton from "@/components/atoms/SegmentedButton";
import type { ColorByMode } from "@/hooks/useColorBy";

interface ColorByToggleProps {
  colorBy: ColorByMode;
  onChange: (mode: ColorByMode) => void;
}

// ADR-020 R5: "학생" 모드 selector 제거. 학생 필터링은 chip + dim contrast 로만 동작.
const MODES = [
  { label: "과목", value: "subject" as ColorByMode },
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
