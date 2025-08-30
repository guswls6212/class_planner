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
  color: string | undefined; // 🆕 planner.ts와 일치하도록 수정
};

// 🆕 여러 학생의 이름을 표시하는 함수
export const getGroupStudentNames = (
  session: Session,
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>,
  students: Array<{ id: string; name: string }>,
  selectedStudentId?: string // 🆕 선택된 학생 ID 추가
): string[] => {
  // enrollmentIds가 undefined이거나 비어있는 경우 처리
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) {
    return [];
  }

  // 🆕 필터링된 상태에서는 선택된 학생의 이름만 반환
  if (selectedStudentId) {
    const selectedStudentEnrollment = session.enrollmentIds.find(
      enrollmentId => {
        const enrollment = enrollments?.find(e => e.id === enrollmentId);
        return enrollment?.studentId === selectedStudentId;
      }
    );

    if (selectedStudentEnrollment) {
      const enrollment = enrollments?.find(
        e => e.id === selectedStudentEnrollment
      );
      const student = students?.find(s => s.id === enrollment?.studentId);
      return student?.name ? [student.name] : [];
    }
    return [];
  }

  // 전체 학생 이름 반환 (기존 로직)
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

// 🆕 그룹 학생 이름을 표시하는 함수 (최대 5명까지 표시)
export const getGroupStudentDisplayText = (studentNames: string[]): string => {
  if (studentNames.length === 0) return '';
  if (studentNames.length === 1) return studentNames[0];
  if (studentNames.length === 2) return studentNames.join(', ');
  if (studentNames.length === 3) return studentNames.join(', ');
  if (studentNames.length === 4) return studentNames.join(', ');
  if (studentNames.length === 5) return studentNames.join(', ');
  // 6명 이상인 경우: 첫 5명 + 외 N명
  return `${studentNames.slice(0, 5).join(', ')} 외 ${studentNames.length - 5}명`;
};

// 🆕 세션 셀 높이를 동적으로 조정하는 스타일
export const getSessionBlockStyles = (
  left: number,
  width: number,
  yOffset: number,
  subjectColor?: string
): CSSProperties => {
  return {
    position: 'absolute',
    left,
    top: yOffset + 1, // 🆕 요일 경계선과 겹치지 않도록 1px 여백 추가
    height: '47px', // 🆕 과목 이름이 잘리지 않도록 높이 증가
    width,
    background: subjectColor ?? '#888',
    color: '#fff',
    borderRadius: 4,
    padding: '0px', // 🆕 padding을 완전히 제거
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
  return yOffset; // 🆕 요일 영역 경계선 안에 정확히 위치하도록 수정
};

export const calculateZIndex = (yOffset: number): number => {
  return yOffset + 1;
};

export const getSubjectColor = (subjectColor?: string): string => {
  return subjectColor && subjectColor.trim() !== '' ? subjectColor : '#888';
};
