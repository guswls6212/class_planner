/**
 * 🔄 Adapter - Legacy Hook Adapter
 *
 * 기존 훅 인터페이스와 새로운 Clean Architecture 훅 간의 호환성을 제공하는 어댑터입니다.
 */

import { useStudentManagementClean } from '@hooks/useStudentManagementClean';
import { useSubjectManagementClean } from '@hooks/useSubjectManagementClean';
import type { Student } from '@lib/planner';

// ===== 학생 관리 어댑터 =====

export const useStudentManagementAdapter = (
  students: Student[],
  setStudents: (students: Student[]) => void,
  setNewStudentName: (name: string) => void,
  subjects: Array<{ id: string; name: string; color: string }> = [],
  sessions: Array<{
    id: string;
    enrollmentIds: string[];
    weekday: number;
    startsAt: string;
    endsAt: string;
    room?: string;
  }> = [],
  enrollments: Array<{ id: string; studentId: string; subjectId: string }> = []
) => {
  const cleanHook = useStudentManagementClean();

  // 기존 인터페이스와 호환되는 함수들
  const addStudent = async (name: string): Promise<boolean> => {
    const success = await cleanHook.addStudent(name);
    if (success) {
      setNewStudentName('');
    }
    return success;
  };

  const deleteStudent = async (id: string): Promise<boolean> => {
    return await cleanHook.deleteStudent(id);
  };

  const validateStudentName = (name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: '학생 이름을 입력해주세요.',
      };
    }

    if (cleanHook.students.some(s => s.name === trimmedName)) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: '이미 존재하는 학생 이름입니다.',
      };
    }

    return {
      name: trimmedName,
      isValid: true,
    };
  };

  return {
    // 기존 인터페이스 호환
    addStudent,
    deleteStudent,
    validateStudentName,

    // 새로운 기능들
    ...cleanHook,

    // 기존 상태와 호환
    formData: { name: '', isValid: false },
    errorMessage: cleanHook.error,
    showUpgradeModal: () => {}, // 기능 가드는 별도 처리
  };
};

// ===== 과목 관리 어댑터 =====

export const useSubjectManagementAdapter = (
  subjects: Array<{ id: string; name: string; color: string }>,
  setSubjects: (
    subjects: Array<{ id: string; name: string; color: string }>
  ) => void,
  setNewSubjectName: (name: string) => void,
  setNewSubjectColor: (color: string) => void
) => {
  const cleanHook = useSubjectManagementClean();

  // 기존 인터페이스와 호환되는 함수들
  const addSubject = async (name: string, color: string): Promise<boolean> => {
    const success = await cleanHook.addSubject(name, color);
    if (success) {
      setNewSubjectName('');
      setNewSubjectColor('#3b82f6'); // 기본 색상으로 리셋
    }
    return success;
  };

  const deleteSubject = async (id: string): Promise<boolean> => {
    return await cleanHook.deleteSubject(id);
  };

  const updateSubject = async (
    id: string,
    updates: { name?: string; color?: string }
  ): Promise<boolean> => {
    return await cleanHook.updateSubject(id, updates);
  };

  const validateSubjectName = (name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: '과목 이름을 입력해주세요.',
      };
    }

    if (cleanHook.subjects.some(s => s.name === trimmedName)) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: '이미 존재하는 과목 이름입니다.',
      };
    }

    return {
      name: trimmedName,
      isValid: true,
    };
  };

  return {
    // 기존 인터페이스 호환
    addSubject,
    deleteSubject,
    updateSubject,
    validateSubjectName,

    // 새로운 기능들
    ...cleanHook,

    // 기존 상태와 호환
    formData: { name: '', color: '#3b82f6', isValid: false },
    errorMessage: cleanHook.error,
  };
};
