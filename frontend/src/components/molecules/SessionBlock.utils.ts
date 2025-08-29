import type { CSSProperties } from 'react';

// 타입을 직접 정의하여 import 의존성 제거
type Session = {
  id: string;
  enrollmentIds: string[];
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
};

type Subject = {
  id: string;
  name: string;
  color: string;
};

// 🆕 여러 학생의 이름을 표시하는 함수
export const getGroupStudentNames = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  students: Array<{ id: string; name: string }>
): string[] => {
  // enrollmentIds가 undefined이거나 비어있는 경우 처리
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return [];
  }

  return session.enrollmentIds
    .map(enrollmentId => {
      const enrollment = enrollments?.find(e => e.id === enrollmentId);
      if (!enrollment) return null;

      const student = students?.find(s => s.id === enrollment.studentId);
      return student?.name;
    })
    .filter(Boolean) as string[];
};

// 🆕 과목 정보를 가져오는 함수
export const getSessionSubject = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  subjects: Subject[]
): Subject | null => {
  // enrollmentIds가 undefined이거나 비어있는 경우 처리
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return null; // fallback 제거, null 반환하여 Unknown 표시
  }

  // 첫 번째 enrollment에서 과목 정보 가져오기
  const firstEnrollment = enrollments?.find(
    e => e.id === session.enrollmentIds[0]
  );
  if (!firstEnrollment) {
    return null; // enrollment가 없으면 null 반환하여 Unknown 표시
  }

  return (
    subjects?.find(s => s.id === firstEnrollment.subjectId) || null // fallback 제거, null 반환하여 Unknown 표시
  );
};

// 🆕 그룹 학생 이름을 표시하는 함수
export const getGroupStudentDisplayText = (studentNames: string[]): string => {
  if (studentNames.length === 0) return '';
  if (studentNames.length === 1) return studentNames[0];
  if (studentNames.length === 2) return studentNames.join(', ');
  return `${studentNames[0]}, ${studentNames[1]} 외 ${studentNames.length - 2}명`;
};

// 유틸리티 함수들 (테스트 가능)
export const getSessionBlockStyles = (
  left: number,
  width: number,
  yOffset: number,
  subjectColor?: string
): CSSProperties => {
  return {
    position: 'absolute',
    left,
    top: 6 + yOffset,
    height: 36, // 시간 정보를 위해 높이 증가
    width,
    background: subjectColor ?? '#888',
    color: '#fff',
    borderRadius: 4,
    padding: '4px 6px', // 상하 패딩 증가
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 1000 + yOffset,
    border: '1px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
  };
};

export const calculateTopPosition = (yOffset: number): number => {
  return 6 + yOffset;
};

export const calculateZIndex = (yOffset: number): number => {
  return yOffset + 1;
};

export const getSubjectColor = (subjectColor?: string): string => {
  return subjectColor && subjectColor.trim() !== '' ? subjectColor : '#888';
};
