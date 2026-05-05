import type { ClassPlannerData } from "../localStorageCrud";
import { filterNonDefaultSubjects } from "./defaultSubjects";

export type LossDiff = {
  /** rejected에는 있고 selected에는 없는 학생 수 */
  students: number;
  /** 기본 과목 제외, rejected에는 있고 selected에는 없는 과목 수 */
  subjects: number;
  /** rejected에는 있고 selected에는 없는 수업 수 */
  sessions: number;
  /** 큰 손실 경고(banner + confirm dialog) 발동 임계치 통과 여부 */
  isLargeLoss: boolean;
};

const LARGE_LOSS_SESSIONS_THRESHOLD = 5;
const LARGE_LOSS_ENTITY_THRESHOLD = 3;

/**
 * `selected` 데이터로 시작했을 때 `rejected`에서 잃게 될 entity 수를 계산한다.
 * id 기반 비교 — 동일 id가 양쪽에 있으면 보존되는 것으로 간주.
 * 기본 과목(DEFAULT_SUBJECT_NAMES)은 손실 카운트에서 제외 (서버가 항상 시드).
 */
export function computeLossDiff(
  selected: ClassPlannerData,
  rejected: ClassPlannerData,
): LossDiff {
  const selectedStudentIds = new Set(selected.students.map((s) => s.id));
  const selectedSubjectIds = new Set(selected.subjects.map((s) => s.id));
  const selectedSessionIds = new Set(selected.sessions.map((s) => s.id));

  const studentsLost = rejected.students.filter(
    (s) => !selectedStudentIds.has(s.id),
  ).length;

  const subjectsLost = filterNonDefaultSubjects(rejected.subjects).filter(
    (s) => !selectedSubjectIds.has(s.id),
  ).length;

  const sessionsLost = rejected.sessions.filter(
    (s) => !selectedSessionIds.has(s.id),
  ).length;

  const isLargeLoss =
    sessionsLost >= LARGE_LOSS_SESSIONS_THRESHOLD ||
    studentsLost >= LARGE_LOSS_ENTITY_THRESHOLD ||
    subjectsLost >= LARGE_LOSS_ENTITY_THRESHOLD;

  return {
    students: studentsLost,
    subjects: subjectsLost,
    sessions: sessionsLost,
    isLargeLoss,
  };
}
