/**
 * 과목 → 강사 색 톤. 색=담당 강사(친구 page1 컨벤션).
 * 블록 색은 테마 독립(채도 높은 고정색) — 다크/라이트 양쪽에서 가독.
 */

export type Tone = "amber" | "sky" | "violet" | "emerald";

export const SUBJECT_TONE: Record<string, Tone> = {
  수학: "amber",
  영어: "sky",
  국어: "violet",
  과학: "emerald",
};

/** 그리드 블록(채워진 색). */
export const TONE_BLOCK: Record<Tone, string> = {
  amber: "border-amber-500 bg-amber-400 text-amber-950",
  sky: "border-sky-500 bg-sky-400 text-sky-950",
  violet: "border-violet-500 bg-violet-400 text-violet-950",
  emerald: "border-emerald-500 bg-emerald-400 text-emerald-950",
};

/** 범례/표 라벨 점. */
export const TONE_DOT: Record<Tone, string> = {
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
};

export function toneOf(subj: string): Tone {
  return SUBJECT_TONE[subj] ?? "amber";
}
