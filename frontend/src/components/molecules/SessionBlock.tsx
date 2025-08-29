import type { Session, Subject } from '../../lib/planner';

interface SessionBlockProps {
  session: Session;
  subject: Subject;
  student?: { id: string; name: string };
  left: number;
  width: number;
  yOffset: number;
  onClick: () => void;
}

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
export const getSessionBlockText = (
  subjectName?: string,
  studentName?: string
): string => {
  if (studentName) {
    return `${subjectName ?? 'Unknown'} ${studentName}`;
  }
  return `${subjectName ?? 'Unknown'}`;
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
  subject,
  student,
  left,
  width,
  yOffset,
  onClick,
}: SessionBlockProps) {
  const styles = getSessionBlockStyles(left, width, yOffset, subject?.color);

  const handleClick = (e: React.MouseEvent) => {
    console.log('🖱️ SessionBlock clicked!', {
      sessionId: session.id,
      subjectName: subject?.name,
      studentName: student?.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      left,
      width,
      yOffset,
      zIndex: styles.zIndex,
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
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* 첫 번째 줄: 과목명과 학생명 */}
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
          {student?.name && (
            <span
              style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: '4px' }}
            >
              {student.name}
            </span>
          )}
        </div>
        {/* 두 번째 줄: 시간 정보 */}
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
