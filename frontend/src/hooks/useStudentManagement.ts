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
  setNewStudentName: (name: string) => void
): StudentActions & { formData: AddStudentFormData } => {
  const [formData, setFormData] = useState<AddStudentFormData>({
    name: '',
    isValid: false,
  });

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

  const addStudent = (name: string) => {
    const validation = validateStudentName(name);

    if (!validation.isValid) {
      alert(validation.errorMessage);
      return;
    }

    const student: Student = { id: uid(), name: validation.name };
    setStudents([...students, student]);
    setNewStudentName('');
    setFormData({ name: '', isValid: false });
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
  };
};
