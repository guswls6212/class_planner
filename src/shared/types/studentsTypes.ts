import type { Student, Subject } from "@lib/planner";

// 학생 관리 관련 타입
export interface StudentManagementData {
  students: Student[];
  newStudentName: string;
  selectedStudentId: string;
}

// 과목 관리 관련 타입
export interface SubjectManagementData {
  subjects: Subject[];
  hasOldSubjects: boolean;
  hasAllNewSubjects: boolean;
}

// 학생 추가 폼 데이터
export interface AddStudentFormData {
  name: string;
  isValid: boolean;
  errorMessage?: string;
}

// localStorage 관련 타입
export interface LocalStorageData {
  students: Student[];
  subjects: Subject[];
  selectedStudentId: string;
  enrollments?: unknown[];
}

// 학생 관리 액션 타입
export interface StudentActions {
  addStudent: (name: string) => void;
  deleteStudent: (studentId: string) => void;
  selectStudent: (studentId: string) => string;
  updateStudentName: (name: string) => void;
}

// 과목 초기화 관련 타입
export interface SubjectInitializationData {
  shouldUpdate: boolean;
  newSubjects: Subject[];
  hasExistingEnrollments: boolean;
}
