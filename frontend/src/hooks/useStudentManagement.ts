import { useState } from 'react';
import type { Student } from '../lib/planner';
import { uid } from '../lib/planner';
import type {
  AddStudentFormData,
  StudentActions,
} from '../types/studentsTypes';
import { useDebouncedSave } from './useDebouncedSave';
import { useFeatureGuard } from './useFeatureGuard';

export const useStudentManagement = (
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
): StudentActions & {
  formData: AddStudentFormData;
  errorMessage: string;
  showUpgradeModal: () => void;
} => {
  const [formData, setFormData] = useState<AddStudentFormData>({
    name: '',
    isValid: false,
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { guardFeature, showUpgradeModal } = useFeatureGuard();
  const { saveData: debouncedSave } = useDebouncedSave();

  const validateStudentName = (name: string): AddStudentFormData => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: '학생 이름을 입력해주세요.',
      };
    }

    if (students.some(s => s.name === trimmedName)) {
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

  const addStudent = (name: string): boolean => {
    // 기능 가드 체크 - 학생 수 제한 확인
    guardFeature('addStudent', students.length, 10);

    // 학생 수 제한 확인
    if (students.length >= 10) {
      return false;
    }

    const validation = validateStudentName(name);

    if (!validation.isValid) {
      setErrorMessage(validation.errorMessage || '');
      return false;
    }

    const student: Student = { id: uid(), name: validation.name };
    const newStudents = [...students, student];
    setStudents(newStudents);
    setNewStudentName('');
    setFormData({ name: '', isValid: false });
    setErrorMessage(''); // 성공 시 에러 메시지 초기화

    // Debounced 서버 저장
    debouncedSave({
      students: newStudents,
      subjects,
      sessions,
      enrollments,
      lastModified: new Date().toISOString(),
      version: '1.0.0',
    });

    return true;
  };

  const deleteStudent = (studentId: string) => {
    const newStudents = students.filter(x => x.id !== studentId);
    setStudents(newStudents);

    // Debounced 서버 저장
    debouncedSave({
      students: newStudents,
      subjects,
      sessions,
      enrollments,
      lastModified: new Date().toISOString(),
      version: '1.0.0',
    });
  };

  const selectStudent = (studentId: string): string => {
    // 선택된 학생이 이미 선택된 상태라면 선택 해제
    const newSelectedId = students.find(s => s.id === studentId)
      ? studentId
      : '';
    return newSelectedId;
  };

  const updateStudentName = (name: string) => {
    const validation = validateStudentName(name);
    setFormData(validation);
  };

  const handleShowUpgradeModal = () => {
    showUpgradeModal('addStudent', students.length, 10);
  };

  return {
    addStudent,
    deleteStudent,
    selectStudent,
    updateStudentName,
    formData,
    errorMessage,
    showUpgradeModal: handleShowUpgradeModal,
  };
};
