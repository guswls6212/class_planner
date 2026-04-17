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

const NEUTRAL_TONE: SessionTone = {
  bg: "var(--color-bg-tertiary)",
  fg: "var(--color-text-primary)",
  accent: "var(--color-primary)",
};

function toSixDigitHex(color: string): string | null {
  const h = color.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h}`;
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return null;
}

export function resolveSessionTone(color: string | undefined): SessionTone {
  if (!color) return NEUTRAL_TONE;
  if (isNamedTone(color)) {
    return {
      bg: `var(--color-subject-${color}-bg)`,
      fg: `var(--color-subject-${color}-fg)`,
      accent: `var(--color-subject-${color}-accent)`,
    };
  }
  const sixDigit = toSixDigitHex(color);
  if (!sixDigit) return NEUTRAL_TONE;
  return {
    bg: tintFromHex(sixDigit, 0.8),
    fg: color.startsWith("#") ? color : `#${color}`,
    accent: color.startsWith("#") ? color : `#${color}`,
  };
}
