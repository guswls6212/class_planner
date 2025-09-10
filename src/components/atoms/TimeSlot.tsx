import React from 'react';

interface TimeSlotProps {
  time: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TimeSlot: React.FC<TimeSlotProps> = ({
  time,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`time-slot ${className}`}
      style={{
        backgroundColor: 'var(--color-background)',
        padding: '8px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60px',
        ...style,
      }}
    >
      {time}
    </div>
  );
};

export default TimeSlot;
