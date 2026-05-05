import type { Subject } from "../planner";

export const DEFAULT_SUBJECT_NAMES = new Set([
  "초등수학",
  "중등수학",
  "중등영어",
  "중등국어",
  "중등과학",
  "중등사회",
  "고등수학",
  "고등영어",
  "고등국어",
]);

export function filterNonDefaultSubjects(subjects: Subject[]): Subject[] {
  return subjects.filter((s) => !DEFAULT_SUBJECT_NAMES.has(s.name));
}
