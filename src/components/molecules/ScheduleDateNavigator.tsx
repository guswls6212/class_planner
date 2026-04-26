import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScheduleDateNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
}

export function ScheduleDateNavigator({
  label,
  onPrev,
  onNext,
  onToday,
  prevAriaLabel,
  nextAriaLabel,
}: ScheduleDateNavigatorProps) {
  const arrowClass =
    "inline-flex items-center justify-center rounded-md p-2 " +
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] " +
    "active:opacity-80 transition-colors";

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      <div className="flex items-center gap-1">
        <button type="button" aria-label={prevAriaLabel} className={arrowClass} onClick={onPrev}>
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="min-w-[10rem] text-center text-base font-semibold text-[var(--color-text-primary)]">
          {label}
        </span>
        <button type="button" aria-label={nextAriaLabel} className={arrowClass} onClick={onNext}>
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>
      <button
        type="button"
        aria-label="오늘"
        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        onClick={onToday}
      >
        오늘
      </button>
    </div>
  );
}
