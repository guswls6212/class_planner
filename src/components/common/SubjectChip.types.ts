export type SubjectChipVariant = "fill" | "border-left" | "soft";
export type SubjectChipSize = "sm" | "md" | "lg";

export interface SubjectChipProps {
  label: string;
  color: string;
  variant?: SubjectChipVariant;
  size?: SubjectChipSize;
  subLabel?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
  "aria-label"?: string;
}
