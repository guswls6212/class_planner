"use client";

interface ColorPickerProps {
  /** 현재 색 (hex). 외부 controlled. */
  value: string;
  /** swatch / native picker / hex text input — 모두 동일 onChange 호출. */
  onChange: (color: string) => void;
  /** swatch 팔레트 (subject/teacher 등 별도). */
  palette: string[];
  /** false 시 native picker + hex 입력 숨김. default true. */
  allowCustom?: boolean;
  /** 전체 비활성. swatch도 안 눌림. */
  disabled?: boolean;
  /** swatch 크기 (px). default 28. */
  swatchSize?: number;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * 통합 ColorPicker — swatch + native color input + hex text input 3-way 동기.
 *
 * 사용처: SubjectAddDetailModal, SubjectDetailPanel(편집), TeacherEditForm.
 * 라벨은 호출자가 직접 — palette 아이콘 + "색상" 텍스트 패턴 권장.
 */
export function ColorPicker({
  value,
  onChange,
  palette,
  allowCustom = true,
  disabled = false,
  swatchSize = 28,
}: ColorPickerProps) {
  const handleHexInput = (raw: string) => {
    let v = raw.trim();
    if (v && !v.startsWith("#")) v = `#${v}`;
    onChange(v.toLowerCase());
  };

  const normalizedValue = value.toLowerCase();

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="색상 팔레트"
      >
        {palette.map((c) => {
          const isActive = normalizedValue === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`색상 ${c}`}
              onClick={() => !disabled && onChange(c)}
              disabled={disabled}
              className={[
                "rounded-full border-2 transition-transform",
                disabled
                  ? "cursor-default opacity-80"
                  : "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] focus:ring-white/40",
              ].join(" ")}
              style={{
                width: swatchSize,
                height: swatchSize,
                backgroundColor: c,
                borderColor: isActive ? "var(--color-text-primary)" : "transparent",
              }}
              data-testid={`color-swatch-${c}`}
            />
          );
        })}
      </div>

      {allowCustom && !disabled && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={HEX_RE.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
            aria-label="색상 직접 선택"
            title="직접 선택"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#3B82F6"
            maxLength={7}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="색상 hex 입력"
          />
        </div>
      )}
    </div>
  );
}
