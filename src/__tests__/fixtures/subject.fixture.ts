import type { Subject } from "@/lib/planner";

/**
 * 과목 fixture — Required<Pick<Subject, "id" | "name">> + 9가지 색상 variant.
 * 색상은 시간표 시각 검증/충돌 시각 표현 디버깅용 — 모든 색상에서 가독성 확인 가능.
 */
type RequiredSubjectCore = Required<Pick<Subject, "id" | "name" | "color">>;

const SUBJECT_PALETTE = [
  "#7DD3FC", // sky
  "#86EFAC", // green
  "#FCA5A5", // red
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#F472B6", // pink
  "#34D399", // emerald
  "#60A5FA", // blue
  "#FB923C", // orange
] as const;

export const FIXTURE_SUBJECT_MATH: RequiredSubjectCore = {
  id: "sub-1",
  name: "수학",
  color: SUBJECT_PALETTE[0],
};

export const FIXTURE_SUBJECT_ENGLISH: RequiredSubjectCore = {
  id: "sub-2",
  name: "영어",
  color: SUBJECT_PALETTE[1],
};

export const FIXTURE_SUBJECT_KOREAN: RequiredSubjectCore = {
  id: "sub-3",
  name: "국어",
  color: SUBJECT_PALETTE[2],
};

export const FIXTURE_SUBJECT_NO_COLOR: Required<Pick<Subject, "id" | "name">> = {
  id: "sub-no-color",
  name: "과목(색 없음)",
};

export const FIXTURE_SUBJECTS: Subject[] = [
  FIXTURE_SUBJECT_MATH,
  FIXTURE_SUBJECT_ENGLISH,
  FIXTURE_SUBJECT_KOREAN,
];

export const FIXTURE_SUBJECT_PALETTE = SUBJECT_PALETTE;

/** 9개 색상 모든 variant — 색상 회귀 테스트/스토리북 색상 매트릭스용 */
export const FIXTURE_SUBJECTS_ALL_COLORS: RequiredSubjectCore[] = SUBJECT_PALETTE.map(
  (color, index) => ({
    id: `sub-color-${index}`,
    name: `과목 ${index + 1}`,
    color,
  }),
);
