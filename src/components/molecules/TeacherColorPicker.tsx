"use client";

import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";

export interface TeacherColorPickerProps {
  selectedColor: string;
  canManage: boolean;
  onColorChange: (color: string) => void;
}

export function TeacherColorPicker({ selectedColor, canManage, onColorChange }: TeacherColorPickerProps) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_TEACHER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => canManage && onColorChange(c)}
            disabled={!canManage}
            className={[
              "w-7 h-7 rounded-full border-2",
              canManage ? "transition-transform hover:scale-110" : "cursor-default opacity-80",
            ].join(" ")}
            style={{
              backgroundColor: c,
              borderColor: selectedColor === c ? "var(--color-text-primary)" : "transparent",
            }}
            aria-label={c}
          />
        ))}
      </div>
      {canManage && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-7 w-8 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
            title="직접 선택"
          />
          <span className="text-[11px] text-[var(--color-text-muted)]">직접 선택</span>
        </div>
      )}
    </>
  );
}
