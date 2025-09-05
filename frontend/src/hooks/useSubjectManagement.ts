import { useCallback, useState } from 'react';
import { uid } from 'uid';
import type {
  Subject,
  SubjectActions,
  SubjectManagementData,
} from '../types/subjectsTypes';

export const useSubjectManagement = (
  initialSubjects: Subject[],
  initialSelectedId: string = ''
): SubjectManagementData & SubjectActions => {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [selectedSubjectId, setSelectedSubjectId] =
    useState<string>(initialSelectedId);

  // 과목 추가
  const addSubject = useCallback(
    (name: string, color: string) => {
      if (!name.trim()) {
        console.warn('과목 이름을 입력해주세요.');
        return;
      }

      // 중복 이름 체크
      const isDuplicate = subjects.some(
        subject => subject.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicate) {
        console.warn('이미 존재하는 과목 이름입니다.');
        return;
      }

      const newSubject: Subject = {
        id: uid(),
        name: name.trim(),
        color,
      };

      setSubjects(prev => [...prev, newSubject]);
    },
    [subjects]
  );

  // 과목 삭제
  const deleteSubject = useCallback(
    (subjectId: string) => {
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));

      // 선택된 과목이 삭제되면 선택 해제
      if (selectedSubjectId === subjectId) {
        setSelectedSubjectId('');
      }
    },
    [selectedSubjectId]
  );

  // 과목 선택
  const selectSubject = useCallback((subjectId: string) => {
    setSelectedSubjectId(subjectId);
  }, []);

  // 과목 수정
  const updateSubject = useCallback(
    (subjectId: string, name: string, color: string) => {
      if (!name.trim()) {
        console.warn('과목 이름을 입력해주세요.');
        return;
      }

      // 중복 이름 체크 (자기 자신 제외)
      const isDuplicate = subjects.some(
        subject =>
          subject.id !== subjectId &&
          subject.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicate) {
        console.warn('이미 존재하는 과목 이름입니다.');
        return;
      }

      setSubjects(prev =>
        prev.map(subject =>
          subject.id === subjectId
            ? { ...subject, name: name.trim(), color }
            : subject
        )
      );
    },
    [subjects]
  );

  return {
    subjects,
    selectedSubjectId,
    addSubject,
    deleteSubject,
    selectSubject,
    updateSubject,
  };
};
