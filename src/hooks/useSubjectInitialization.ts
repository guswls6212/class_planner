import { useEffect } from 'react';
import { logger } from "../lib/logger";
import type { Subject } from '../types/subjectsTypes';

const SUBJECTS_KEY = 'subjects';
const SELECTED_SUBJECT_KEY = 'selectedSubjectId';

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

export const useSubjectInitialization = (
  setSubjects: (subjects: Subject[]) => void,
  setSelectedSubjectId: (id: string) => void
) => {
  useEffect(() => {
    console.log('🔄 과목 목록을 초기화합니다...');

    try {
      // localStorage에서 과목 목록 불러오기
      const savedSubjects = localStorage.getItem(SUBJECTS_KEY);
      const savedSelectedId = localStorage.getItem(SELECTED_SUBJECT_KEY);

      if (savedSubjects) {
        const parsedSubjects = JSON.parse(savedSubjects) as Subject[];
        console.log(
          '✅ 저장된 과목 목록을 불러왔습니다:',
          parsedSubjects.map(s => s.name)
        );
        setSubjects(parsedSubjects);

        if (savedSelectedId) {
          setSelectedSubjectId(savedSelectedId);
        }
      } else {
        console.log(
          '🆕 기본 과목 목록을 생성합니다:',
          DEFAULT_SUBJECTS.map(s => s.name)
        );
        setSubjects(DEFAULT_SUBJECTS);
        // 기본 과목을 localStorage에 저장
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      }
    } catch (error) {
      console.error('❌ 과목 목록 초기화 중 오류 발생:', error);
      console.log('🔄 기본 과목 목록으로 초기화합니다.');
      setSubjects(DEFAULT_SUBJECTS);
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
    }
  }, [setSubjects, setSelectedSubjectId]);
};
