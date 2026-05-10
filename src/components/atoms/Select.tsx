"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

/**
 * 일관된 디자인의 Select atom.
 *
 * native `<select>`의 OS 기본 화살표가 우측 끝에 붙어 어색한 문제(UAT 2026-05-10 보고)를
 * `appearance-none` + lucide ChevronDown overlay로 해소. 모든 select 사용처는 본 atom 사용.
 *
 * - `size="md"` (default): 일반 폼 (py-2 pl-3 pr-9)
 * - `size="sm"`: detail panel inline edit form 등 좁은 컨텍스트 (py-1 pl-2 pr-7)
 * - className은 default 위에 추가됨 (flex-1, w-full 등 layout class 가능)
 */
type SelectSize = "sm" | "md";
type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">;
interface SelectProps extends NativeSelectProps {
  size?: SelectSize;
}

const SIZE_CLASSES: Record<SelectSize, { select: string; chevronOffset: string; chevronSize: number }> = {
  sm: { select: "py-1 pl-2 pr-7 text-sm", chevronOffset: "right-2", chevronSize: 14 },
  md: { select: "py-2 pl-3 pr-9 text-sm", chevronOffset: "right-3", chevronSize: 16 },
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", size = "md", children, ...rest },
  ref,
) {
  const s = SIZE_CLASSES[size];
  return (
    <div className={`relative inline-block ${className.includes("w-full") || className.includes("flex-1") ? className : `w-full ${className}`}`}>
      <select
        ref={ref}
        {...rest}
        className={`w-full appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${s.select}`}
      >
        {children}
      </select>
      <ChevronDown
        size={s.chevronSize}
        strokeWidth={1.5}
        className={`pointer-events-none absolute ${s.chevronOffset} top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]`}
      />
    </div>
  );
});
