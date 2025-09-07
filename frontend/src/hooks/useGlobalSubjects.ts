import { useCallback, useEffect, useState } from 'react';
import { uid } from 'uid';
import type { Subject } from '../types/subjectsTypes';

const SUBJECTS_KEY = 'subjects';

// 기본 과목 목록 (고정 ID 사용)
const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'default-1', name: '초등수학', color: '#fbbf24' }, // 밝은 노란색
  { id: 'default-2', name: '중등수학', color: '#f59e0b' }, // 주황색
  { id: 'default-3', name: '중등영어', color: '#3b82f6' }, // 파란색
  { id: 'default-4', name: '중등국어', color: '#10b981' }, // 초록색
  { id: 'default-5', name: '중등과학', color: '#ec4899' }, // 분홍색
  { id: 'default-6', name: '중등사회', color: '#06b6d4' }, // 청록색
  { id: 'default-7', name: '고등수학', color: '#ef4444' }, // 빨간색
  { id: 'default-8', name: '고등영어', color: '#8b5cf6' }, // 보라색
  { id: 'default-9', name: '고등국어', color: '#059669' }, // 진한 초록색
];

export const useGlobalSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // localStorage에서 과목 목록 불러오기
  const loadSubjects = useCallback(() => {
    try {
      const savedSubjects = localStorage.getItem(SUBJECTS_KEY);

      if (savedSubjects) {
        const parsedSubjects = JSON.parse(savedSubjects) as Subject[];
        setSubjects(parsedSubjects);
      } else {
        setSubjects(DEFAULT_SUBJECTS);
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      }
    } catch (error) {
      console.error('❌ 과목 목록 로드 중 오류 발생:', error);
      setSubjects(DEFAULT_SUBJECTS);
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
    }
  }, []);

  // localStorage에 과목 목록 저장
  const saveSubjects = useCallback((newSubjects: Subject[]) => {
    try {
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(newSubjects));
      console.log(
        '💾 과목 목록을 저장했습니다:',
        newSubjects.map(s => s.name),
      );
    } catch (error) {
      console.error('❌ 과목 목록 저장 중 오류 발생:', error);
    }
  }, []);

  // 과목 추가
  const addSubject = useCallback(
    (name: string, color: string): boolean => {
      console.log('🔍 useGlobalSubjects - addSubject 시작');
      console.log('🔍 받은 과목 이름:', name);
      console.log('🔍 받은 색상:', color);
      console.log('🔍 현재 과목 목록:', subjects);

      // 에러 메시지 초기화
      setErrorMessage('');

      if (!name.trim()) {
        console.log('❌ 과목 이름이 비어있음');
        setErrorMessage('과목 이름을 입력해주세요.');
        return false;
      }

      console.log('✅ 과목 이름 유효 - 새 과목 생성');
      const newSubject: Subject = {
        id: uid(),
        name: name.trim(),
        color,
      };
      console.log('🔍 생성된 새 과목:', newSubject);

      const updatedSubjects = [...subjects, newSubject];
      console.log('🔍 업데이트된 과목 목록:', updatedSubjects);

      setSubjects(updatedSubjects);
      saveSubjects(updatedSubjects);

      console.log('✅ 과목 추가 완료');
      return true;
    },
    [subjects, saveSubjects],
  );

  // 과목 삭제
  const deleteSubject = useCallback(
    (subjectId: string) => {
      const updatedSubjects = subjects.filter(
        subject => subject.id !== subjectId,
      );
      setSubjects(updatedSubjects);
      saveSubjects(updatedSubjects);
    },
    [subjects, saveSubjects],
  );

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
          subject.name.toLowerCase() === name.toLowerCase(),
      );

      if (isDuplicate) {
        console.warn('이미 존재하는 과목 이름입니다.');
        return;
      }

      const updatedSubjects = subjects.map(subject =>
        subject.id === subjectId
          ? { ...subject, name: name.trim(), color }
          : subject,
      );

      setSubjects(updatedSubjects);
      saveSubjects(updatedSubjects);
    },
    [subjects, saveSubjects],
  );

  // 초기화
  useEffect(() => {
    if (!isInitialized) {
      loadSubjects();
      setIsInitialized(true);
    }
  }, [isInitialized, loadSubjects]);

  return {
    subjects,
    isInitialized,
    errorMessage,
    addSubject,
    deleteSubject,
    updateSubject,
    loadSubjects,
  };
};
