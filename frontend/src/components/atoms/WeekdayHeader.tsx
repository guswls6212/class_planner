import React from 'react';

interface WeekdayHeaderProps {
  weekday: number;
  className?: string;
  style?: React.CSSProperties;
}

export const WeekdayHeader: React.FC<WeekdayHeaderProps> = ({
  weekday,
  className = '',
  style = {},
}) => {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekdayName = weekdays[weekday];

  return (
    <div
      className={`weekday-header ${className}`}
      style={{
        backgroundColor: 'var(--color-background)',
        padding: '12px 8px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60px',
        ...style,
      }}
    >
      {weekdayName}
    </div>
  );
};

export default WeekdayHeader;
