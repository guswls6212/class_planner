import type { Teacher, TeacherRole } from "@/lib/planner";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";

/**
 * 강사 fixture — Required<Pick<Teacher, "id" | "name" | "color">> + role 3종.
 *
 * 핵심 invariant:
 * - DEFAULT_TEACHER_COLORS 8색상을 모두 fixture에 사용 → 색상 변경 시 즉시 감지
 * - role: owner / admin / member 모두 커버
 */
type RequiredTeacherCore = Required<Pick<Teacher, "id" | "name" | "color">>;

export const FIXTURE_TEACHER_OWNER: RequiredTeacherCore & Pick<Teacher, "role"> = {
  id: "tc-owner",
  name: "원장 김",
  color: DEFAULT_TEACHER_COLORS[0],
  role: "owner" satisfies TeacherRole,
};

export const FIXTURE_TEACHER_ADMIN: RequiredTeacherCore & Pick<Teacher, "role" | "email"> = {
  id: "tc-admin",
  name: "이매니저",
  color: DEFAULT_TEACHER_COLORS[1],
  role: "admin" satisfies TeacherRole,
  email: "admin@example.com",
};

export const FIXTURE_TEACHER_MEMBER: RequiredTeacherCore &
  Pick<Teacher, "role" | "email" | "phone"> = {
  id: "tc-member",
  name: "박강사",
  color: DEFAULT_TEACHER_COLORS[2],
  role: "member" satisfies TeacherRole,
  email: "member@example.com",
  phone: "010-1111-2222",
};

export const FIXTURE_TEACHER_FULL: Required<Omit<Teacher, "subjectIds">> = {
  id: "tc-full",
  name: "최강사",
  color: DEFAULT_TEACHER_COLORS[3],
  userId: "user-uuid-1",
  email: "choi@example.com",
  phone: "010-9999-8888",
  role: "member",
  notes: "수학 전문, 토요일 가능",
};

export const FIXTURE_TEACHERS: Teacher[] = [
  FIXTURE_TEACHER_OWNER,
  FIXTURE_TEACHER_ADMIN,
  FIXTURE_TEACHER_MEMBER,
  FIXTURE_TEACHER_FULL,
];

/** 8색상 모든 variant — 강사 색상 회귀 가드 */
export const FIXTURE_TEACHERS_ALL_COLORS: RequiredTeacherCore[] = DEFAULT_TEACHER_COLORS.map(
  (color, index) => ({
    id: `tc-color-${index}`,
    name: `강사 ${index + 1}`,
    color,
  }),
);
