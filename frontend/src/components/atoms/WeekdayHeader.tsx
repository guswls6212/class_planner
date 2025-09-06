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

  // 잘못된 요일 인덱스에 대한 에러 처리
  if (weekday < 0 || weekday >= weekdays.length) {
    throw new Error(
      `Invalid weekday index: ${weekday}. Must be between 0 and 6.`,
    );
  }

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
