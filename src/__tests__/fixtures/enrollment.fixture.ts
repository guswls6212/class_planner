import type { Enrollment } from "@/lib/planner";

/**
 * 수강신청 fixture — Required<Enrollment> 패턴으로 모든 필드 강제.
 *
 * 1:1과 1:N (group session) 두 variant 제공.
 */
export const FIXTURE_ENROLLMENT_1V1: Required<Enrollment> = {
  id: "enr-1",
  studentId: "stu-1",
  subjectId: "sub-1",
};

export const FIXTURE_ENROLLMENT_GROUP_A: Required<Enrollment> = {
  id: "enr-grp-1",
  studentId: "stu-1",
  subjectId: "sub-2",
};

export const FIXTURE_ENROLLMENT_GROUP_B: Required<Enrollment> = {
  id: "enr-grp-2",
  studentId: "stu-2",
  subjectId: "sub-2",
};

export const FIXTURE_ENROLLMENT_GROUP_C: Required<Enrollment> = {
  id: "enr-grp-3",
  studentId: "stu-3",
  subjectId: "sub-2",
};

export const FIXTURE_ENROLLMENTS: Enrollment[] = [
  FIXTURE_ENROLLMENT_1V1,
  FIXTURE_ENROLLMENT_GROUP_A,
  FIXTURE_ENROLLMENT_GROUP_B,
  FIXTURE_ENROLLMENT_GROUP_C,
];

/** 그룹 수업용 — 같은 subjectId(sub-2)에 3명 enrolled */
export const FIXTURE_ENROLLMENTS_GROUP: Enrollment[] = [
  FIXTURE_ENROLLMENT_GROUP_A,
  FIXTURE_ENROLLMENT_GROUP_B,
  FIXTURE_ENROLLMENT_GROUP_C,
];
