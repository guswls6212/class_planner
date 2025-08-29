import React from 'react';
import type { Session, Subject } from '../../lib/planner';

interface SessionBlockProps {
  session: Session;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  yPosition: number;
  left: number;
  width: number;
  yOffset: number;
  onClick: () => void;
  style?: React.CSSProperties;
}

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
// eslint-disable-next-line react-refresh/only-export-components
export const getSessionBlockStyles = (
  left: number,
  width: number,
  yOffset: number,
  subjectColor?: string
): React.CSSProperties => {
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

// eslint-disable-next-line react-refresh/only-export-components
export const calculateTopPosition = (yOffset: number): number => {
  return 6 + yOffset;
};

// eslint-disable-next-line react-refresh/only-export-components
export const calculateZIndex = (yOffset: number): number => {
  return yOffset + 1;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getSubjectColor = (subjectColor?: string): string => {
  return subjectColor && subjectColor.trim() !== '' ? subjectColor : '#888';
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateSessionBlockProps = (
  left: number,
  width: number,
  yOffset: number
): boolean => {
  return left >= 0 && width > 0 && yOffset >= 0;
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowSubjectName = (subjectName?: string): boolean => {
  return Boolean(subjectName);
};

export default function SessionBlock({
  session,
  subjects,
  enrollments,
  students,
  left,
  width,
  yOffset,
  onClick,
}: SessionBlockProps) {
  // 🆕 과목과 학생 정보 가져오기
  const subject = getSessionSubject(session, enrollments, subjects);
  const studentNames = getGroupStudentNames(session, enrollments, students);

  const styles = getSessionBlockStyles(left, width, yOffset, subject?.color);

  const handleClick = (e: React.MouseEvent) => {
    console.log('🖱️ SessionBlock clicked!', {
      sessionId: session.id,
      subjectName: subject?.name,
      studentNames,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      left,
      width,
      yOffset,
    });
    e.stopPropagation(); // 이벤트 버블링 방지
    onClick();
  };

  return (
    <div
      style={styles}
      onClick={handleClick}
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      className="session-block"
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#fff', fontWeight: '600' }}>
            {subject?.name ?? 'Unknown'}
          </span>
          {studentNames.length > 0 && (
            <span
              style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: '4px' }}
            >
              {getGroupStudentDisplayText(studentNames)}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '2px',
            textAlign: 'center',
          }}
        >
          {session.startsAt} - {session.endsAt}
        </div>
      </div>
    </div>
  );
}
