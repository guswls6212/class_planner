import type { Session, Subject } from '../../lib/planner';

interface SessionBlockProps {
  session: Session;
  subject: Subject;
  left: number;
  width: number;
  yOffset: number;
  onClick: () => void;
}

export default function SessionBlock({
  session,
  subject,
  left,
  width,
  yOffset,
  onClick,
}: SessionBlockProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 6 + yOffset,
        height: 28,
        width,
        background: subject?.color ?? '#888',
        color: '#fff',
        borderRadius: 4,
        padding: '0 6px',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: yOffset + 1,
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      {subject?.name} {session.startsAt}-{session.endsAt}
    </div>
  );
}
