interface GradeBadgeProps {
  grade?: string | null;
  /** Test selector suffix (e.g., student id). 학생 목록은 `student-grade-chip-${id}` 컨벤션 유지. */
  testIdSuffix?: string;
  className?: string;
}

export function GradeBadge({ grade, testIdSuffix, className = "" }: GradeBadgeProps) {
  if (!grade) return null;
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 leading-none ${className}`}
      data-testid={testIdSuffix ? `student-grade-chip-${testIdSuffix}` : "grade-badge"}
    >
      {grade}
    </span>
  );
}
