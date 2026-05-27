/**
 * addStudentFromInput 의 매칭 + dup-check + max-check logic 만 pure function.
 *
 * 기존: schedule/page.tsx 의 addStudentFromInput (42 줄) 가 trim + students.find +
 * groupModalData 분기 + 동명이인 검색 + max 제한 + 토스트 메시지 빌드 모두 inline.
 *
 * 본 utils: **state mutation 안 함**. action + 토스트 메시지 반환. addStudent /
 * showToast 호출은 page 가 결정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 16 (loop iteration 11, utils 패턴 확장).
 */

import type { Student } from "@/lib/planner";

export type AddStudentFromInputOutcome =
  /** trimmed input empty — page 가 silent return */
  | { action: "noop" }
  /** student found + can be added → page 가 addStudent(studentId) */
  | { action: "add"; studentId: string }
  /** student found 이미 selected — 동명이인 N+1 명 있으면 hint */
  | {
      action: "already-added";
      studentName: string;
      otherDuplicatesCount: number;
    }
  /** 14 max 도달 — page 가 warning 토스트 */
  | { action: "max-reached" }
  /** 매칭 없음 — page 가 info 토스트 (CTA 안내) */
  | { action: "not-found"; trimmedInput: string };

export function planAddStudentFromInput(params: {
  input: string;
  students: Student[];
  /** 이미 selected 인 studentIds */
  selectedStudentIds: string[];
  /** 14 max (group modal default) */
  maxStudents: number;
}): AddStudentFromInputOutcome {
  const trimmedInput = params.input.trim();
  if (!trimmedInput) {
    return { action: "noop" };
  }

  const lowerInput = trimmedInput.toLowerCase();

  // 정확한 이름으로 기존 학생 찾기 (동명이인은 첫 번째만 발견).
  const student = params.students.find(
    (s) => s.name.toLowerCase() === lowerInput,
  );

  if (!student) {
    return { action: "not-found", trimmedInput };
  }

  // 이미 추가됐는지 — UAT 2026-05-10 silent failure 회귀 가드.
  if (params.selectedStudentIds.includes(student.id)) {
    const otherDuplicates = params.students.filter(
      (s) => s.id !== student.id && s.name.toLowerCase() === lowerInput,
    );
    return {
      action: "already-added",
      studentName: trimmedInput,
      otherDuplicatesCount: otherDuplicates.length,
    };
  }

  // 14 명 max 도달 가드.
  if (params.selectedStudentIds.length >= params.maxStudents) {
    return { action: "max-reached" };
  }

  return { action: "add", studentId: student.id };
}
