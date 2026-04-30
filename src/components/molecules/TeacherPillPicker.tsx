"use client";

import Link from "next/link";
import type { Teacher } from "@/lib/planner";

interface TeacherPillPickerProps {
  teachers: Teacher[];
  selectedTeacherId?: string | null;
  onSelect: (teacherId: string | null) => void;
  className?: string;
}

export default function TeacherPillPicker({
  teachers,
  selectedTeacherId,
  onSelect,
  className = "",
}: TeacherPillPickerProps) {
  if (teachers.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-[12px] text-[var(--color-text-muted)]">강사 없음</span>
        <Link
          href="/teachers"
          target="_blank"
          className="text-[12px] text-[var(--color-accent)] hover:underline"
        >
          강사 등록 →
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {teachers.map((teacher) => {
        const isActive = selectedTeacherId === teacher.id;
        return (
          <button
            key={teacher.id}
            type="button"
            onClick={() => onSelect(isActive ? null : teacher.id)}
            aria-pressed={isActive}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all duration-150",
              isActive
                ? "border border-[#a78bfa] text-[var(--color-text-primary)] font-medium"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
            style={
              isActive
                ? {
                    // Dynamic rgba values can't be expressed as static Tailwind classes
                    background: "rgba(167,139,250,0.18)",
                    boxShadow: "0 0 0 3px rgba(167,139,250,0.08)",
                  }
                : { background: "var(--color-bg-secondary)" }
            }
          >
            <span
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              // teacher.color is a runtime value — inline style required
              style={{ backgroundColor: teacher.color }}
            />
            {teacher.name}
          </button>
        );
      })}
    </div>
  );
}
