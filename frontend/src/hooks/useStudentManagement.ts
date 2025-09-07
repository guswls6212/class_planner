import { useState } from 'react';
import type { Student } from '../lib/planner';
import { uid } from '../lib/planner';
import type {
  AddStudentFormData,
  StudentActions,
} from '../types/studentsTypes';

export const useStudentManagement = (
  students: Student[],
  setStudents: (students: Student[]) => void,
  setNewStudentName: (name: string) => void,
): StudentActions & { formData: AddStudentFormData; errorMessage: string } => {
  const [formData, setFormData] = useState<AddStudentFormData>({
    name: '',
    isValid: false,
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

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
    const validation = validateStudentName(name);

    if (!validation.isValid) {
      setErrorMessage(validation.errorMessage || '');
      return false;
    }

    const student: Student = { id: uid(), name: validation.name };
    setStudents([...students, student]);
    setNewStudentName('');
    setFormData({ name: '', isValid: false });
    setErrorMessage(''); // 성공 시 에러 메시지 초기화
    return true;
  };

  const deleteStudent = (studentId: string) => {
    setStudents(students.filter(x => x.id !== studentId));
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

  return {
    addStudent,
    deleteStudent,
    selectStudent,
    updateStudentName,
    formData,
    errorMessage,
  };
};
