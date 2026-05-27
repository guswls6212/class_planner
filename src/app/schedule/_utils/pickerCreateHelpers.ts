/**
 * Schedule 의 picker inline create helper utils.
 *
 * 기존: schedule/page.tsx 의 handleCreateStudent/Teacher/SubjectFromInput 3 handler 가
 * page state setter + creation logic + duplicate 검출 + color picker 모두 inline.
 *
 * 본 utils: **pure function** 으로 creation logic 만 추출 — state setter (setXxxCreating /
 * setXxxCreateError) 는 page 안 유지. return value 로 page 가 분기.
 *
 * Sub-proposal: schedule-page-split-refactor PR 4 (Layer 1 — independent, utils 패턴 첫 검증).
 */

import {
  getNextUnusedColor,
  TEACHER_PALETTE,
  SUBJECT_PALETTE,
} from "@/lib/colors/getNextUnusedColor";
import { getClassPlannerData } from "@/lib/localStorageCrud";

export type CreateFailureReason = "no-permission" | "empty" | "duplicate" | "error";

export interface CreateStudentResult {
  ok: true;
  studentId: string;
}
export interface CreateTeacherResult {
  ok: true;
  teacherId: string;
}
export interface CreateSubjectResult {
  ok: true;
  subjectId: string;
}
export type CreateFailure = { ok: false; reason: CreateFailureReason };

export async function createStudentFromInputUtil(params: {
  input: string;
  createStudent: (name: string) => Promise<boolean>;
}): Promise<CreateStudentResult | CreateFailure> {
  const trimmed = params.input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  try {
    const success = await params.createStudent(trimmed);
    if (!success) return { ok: false, reason: "duplicate" };
    const data = getClassPlannerData();
    const newStudent = data.students.find((s) => s.name.trim() === trimmed);
    if (!newStudent) return { ok: false, reason: "error" };
    return { ok: true, studentId: newStudent.id };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function createTeacherFromInputUtil(params: {
  input: string;
  canManage: boolean;
  teachers: Array<{ color: string }>;
  createTeacher: (name: string, color: string) => Promise<boolean>;
}): Promise<CreateTeacherResult | CreateFailure> {
  if (!params.canManage) return { ok: false, reason: "no-permission" };
  const trimmed = params.input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  try {
    const usedColors = params.teachers.map((t) => t.color);
    const color = getNextUnusedColor(TEACHER_PALETTE, usedColors);
    const success = await params.createTeacher(trimmed, color);
    if (!success) return { ok: false, reason: "duplicate" };
    const data = getClassPlannerData();
    const newTeacher = data.teachers.find((t) => t.name.trim() === trimmed);
    if (!newTeacher) return { ok: false, reason: "error" };
    return { ok: true, teacherId: newTeacher.id };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function createSubjectFromInputUtil(params: {
  input: string;
  canManage: boolean;
  subjects: Array<{ color?: string }>;
  createSubject: (name: string, color: string) => Promise<boolean>;
}): Promise<CreateSubjectResult | CreateFailure> {
  if (!params.canManage) return { ok: false, reason: "no-permission" };
  const trimmed = params.input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  try {
    const usedColors = params.subjects
      .map((s) => s.color)
      .filter((c): c is string => !!c);
    const color = getNextUnusedColor(SUBJECT_PALETTE, usedColors);
    const success = await params.createSubject(trimmed, color);
    if (!success) return { ok: false, reason: "duplicate" };
    const data = getClassPlannerData();
    const newSubject = data.subjects.find((s) => s.name.trim() === trimmed);
    if (!newSubject) return { ok: false, reason: "error" };
    return { ok: true, subjectId: newSubject.id };
  } catch {
    return { ok: false, reason: "error" };
  }
}
