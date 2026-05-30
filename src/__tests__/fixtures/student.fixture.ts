import type { Student } from "@/lib/planner";

/**
 * 학생 fixture — Required<Pick<Student, "id" | "name">> 패턴으로 핵심 필드 누락
 * 컴파일 감지. 옵션 필드(grade/school/birthDate/phone/gender)는 variant별로 다름.
 *
 * 사용처: stories, unit/integration 테스트, mock data.
 */
type RequiredStudentCore = Required<Pick<Student, "id" | "name">>;

export const FIXTURE_STUDENT: RequiredStudentCore & Pick<Student, "grade" | "school"> = {
  id: "stu-1",
  name: "홍길동",
  grade: "고1",
  school: "서울고등학교",
};

export const FIXTURE_STUDENT_NO_PROFILE: RequiredStudentCore = {
  id: "stu-2",
  name: "김영수",
};

export const FIXTURE_STUDENT_FULL: Required<Student> = {
  id: "stu-3",
  name: "박지민",
  gender: "F",
  birthDate: "2009-03-12",
  grade: "중3",
  school: "강남중학교",
  phone: "010-1234-5678",
};

export const FIXTURE_STUDENTS: Student[] = [
  FIXTURE_STUDENT,
  FIXTURE_STUDENT_NO_PROFILE,
  FIXTURE_STUDENT_FULL,
];
