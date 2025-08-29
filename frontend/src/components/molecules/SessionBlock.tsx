import React from 'react';
import type { Session, Subject } from '../../lib/planner';
import {
  getGroupStudentDisplayText,
  getGroupStudentNames,
  getSessionBlockStyles,
  getSessionSubject,
} from './SessionBlock.utils';

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
