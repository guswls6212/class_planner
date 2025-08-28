import type { Session, Subject } from '../../lib/planner';

interface SessionBlockProps {
  session: Session;
  subject: Subject;
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
    height: 28,
    width,
    background: subjectColor ?? '#888',
    color: '#fff',
    borderRadius: 4,
    padding: '0 6px',
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
  startsAt?: string,
  endsAt?: string
): string => {
  return `${subjectName ?? 'Unknown'} ${startsAt ?? ''}-${endsAt ?? ''}`;
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
  left,
  width,
  yOffset,
  onClick,
}: SessionBlockProps) {
  const styles = getSessionBlockStyles(left, width, yOffset, subject?.color);
  const blockText = getSessionBlockText(
    subject?.name,
    session.startsAt,
    session.endsAt
  );

  const handleClick = (e: React.MouseEvent) => {
    console.log('🖱️ SessionBlock clicked!', {
      sessionId: session.id,
      subjectName: subject?.name,
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
      {blockText}
    </div>
  );
}
