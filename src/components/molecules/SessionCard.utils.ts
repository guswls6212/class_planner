import { tintFromHex } from "@/lib/colors/tintFromHex";

export interface SessionTone {
  bg: string;
  fg: string;
  accent: string;
}

const NAMED_TONES = [
  "blue",
  "red",
  "violet",
  "emerald",
  "amber",
  "pink",
  "teal",
  "orange",
] as const;

export type NamedTone = (typeof NAMED_TONES)[number];

export function isNamedTone(color: string): color is NamedTone {
  return (NAMED_TONES as readonly string[]).includes(color);
}

export function resolveSessionTone(color: string | undefined): SessionTone {
  if (!color) {
    return {
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    };
  }
  if (isNamedTone(color)) {
    return {
      bg: `var(--color-subject-${color}-bg)`,
      fg: `var(--color-subject-${color}-fg)`,
      accent: `var(--color-subject-${color}-accent)`,
    };
  }
  return {
    bg: tintFromHex(color, 0.8),
    fg: color,
    accent: color,
  };
}
