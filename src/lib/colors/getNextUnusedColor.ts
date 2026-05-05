import { DEFAULT_TEACHER_COLORS } from "../teacherColors";
import { SUBJECT_PALETTE_HEX } from "../schedule/subjectColorPalette";

export const TEACHER_PALETTE: readonly string[] = DEFAULT_TEACHER_COLORS;
export const SUBJECT_PALETTE: readonly string[] = Object.values(
  SUBJECT_PALETTE_HEX,
);

export function getNextUnusedColor(
  palette: readonly string[],
  used: readonly string[],
): string {
  if (palette.length === 0) {
    throw new Error("getNextUnusedColor: palette is empty");
  }
  const usedSet = new Set(used);
  for (const color of palette) {
    if (!usedSet.has(color)) return color;
  }
  return palette[used.length % palette.length];
}
