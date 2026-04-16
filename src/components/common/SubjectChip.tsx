import type { SubjectChipProps } from "./SubjectChip.types";

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[11px]",
  md: "px-2 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
} as const;

export default function SubjectChip({
  label,
  color,
  variant = "fill",
  size = "sm",
  subLabel,
  badge,
  onClick,
  className = "",
  style: styleOverride,
  ...rest
}: SubjectChipProps) {
  const Tag = onClick ? "button" : "div";
  const style: React.CSSProperties = { ...styleOverride };
  const classes = [
    SIZE_CLASSES[size],
    "rounded-[6px]",
    "leading-tight",
    "inline-flex",
    "items-center",
    "gap-1",
  ];

  if (variant === "fill") {
    style.backgroundColor = color;
    style.color = "#ffffff";
  } else if (variant === "border-left") {
    style.borderLeft = `3px solid ${color}`;
    classes.push("bg-[var(--color-bg-tertiary)]", "pl-2", "text-[var(--color-text-primary)]");
  } else {
    style.backgroundColor = `${color}1A`;
    style.color = color;
  }

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${classes.join(" ")} ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
      style={style}
      data-testid={rest["data-testid"]}
      aria-label={rest["aria-label"]}
    >
      <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      {subLabel && <span className="opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">{subLabel}</span>}
      {badge}
    </Tag>
  );
}
