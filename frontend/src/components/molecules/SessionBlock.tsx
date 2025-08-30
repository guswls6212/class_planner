import React from 'react';
import {
  getGroupStudentDisplayText,
  getGroupStudentNames,
  getSessionBlockStyles,
  getSessionSubject,
} from './SessionBlock.utils';

// 로컬 타입 정의 (SessionBlock.utils.ts와 동일)
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '4px', // 🆕 패딩을 줄여서 내용이 잘리지 않도록
        }}
      >
        {/* 첫 번째 줄: 과목명 - 왼쪽 위 배치 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            height: '11px', // 🆕 폰트 크기와 동일하게 설정
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontWeight: '600',
              fontSize: '11px',
              textAlign: 'left',
              letterSpacing: '-0.5px',
              lineHeight: '1.1',
            }}
          >
            {subject?.name ?? 'Unknown'}
          </span>
        </div>

        {/* 두 번째 줄: 학생명 - 중간 오른쪽 정렬 */}
        {studentNames.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '10px', // 🆕 폰트 크기와 동일하게 설정
              overflow: 'hidden',
              marginTop: '1px', // 🆕 위쪽 margin 1px
              marginBottom: '1px', // 🆕 아래쪽 margin 1px 추가
            }}
          >
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '10px',
                textAlign: 'right',
                letterSpacing: '-0.3px',
                lineHeight: '1.1',
              }}
            >
              {getGroupStudentDisplayText(studentNames)}
            </span>
          </div>
        )}

        {/* 세 번째 줄: 시간 정보 - 하단 중앙 정렬 */}
        <div
          style={{
            fontSize: '9px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '1px', // 🆕 auto 대신 1px로 변경
            textAlign: 'center',
            height: '9px', // 🆕 폰트 크기와 동일하게 설정
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '-0.2px',
            lineHeight: '1.1',
          }}
        >
          {session.startsAt} - {session.endsAt}
        </div>
      </div>
    </div>
  );
}
