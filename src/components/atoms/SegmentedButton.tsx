interface Option<T extends string> {
  label: string;
  /** 모바일(<640px)에서 사용할 짧은 라벨. 미지정 시 label 그대로. */
  mobileLabel?: string;
  value: T;
}

interface SegmentedButtonProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

export default function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className = "",
}: SegmentedButtonProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex rounded-md overflow-hidden border border-[var(--color-border)] ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-sm transition-colors ${
            value === opt.value
              ? "bg-accent text-white font-medium"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
          }`}
        >
          {opt.mobileLabel ? (
            <>
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.mobileLabel}</span>
            </>
          ) : (
            opt.label
          )}
        </button>
      ))}
    </div>
  );
}
