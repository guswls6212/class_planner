import React from 'react';
import type { Session, Subject } from '../../lib/planner';

import DropZone from './DropZone';
import SessionBlock from './SessionBlock';

interface TimeTableRowProps {
  weekday: number;
  height: number;
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  sessionYPositions: Map<string, number>;
  onSessionClick: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  height,
  sessions,
  subjects,
  enrollments,
  sessionYPositions,
  onSessionClick,
  onDrop,
  onEmptySpaceClick,
  className = '',
  style = {},
}) => {
  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
  const weekdayName = weekdays[weekday];

  return (
    <div
      className={`time-table-row ${className}`}
      style={{
        display: 'contents',
        ...style,
      }}
    >
      {/* 요일 라벨 (Y축 왼쪽) */}
      <div
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
          height: `${height}px`,
        }}
      >
        {weekdayName}
      </div>

      {/* 요일별 세션 컨테이너 (X축 전체) */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-background)',
          minHeight: `${height}px`,
          border: '1px solid var(--color-border-grid)',
          gridColumn: '2 / -1', // 첫 번째 열(요일 라벨)을 제외한 모든 열 차지
        }}
      >
        {/* 시간별 세로 구분선 */}
        {Array.from({ length: 15 }, (_, hour) => {
          const left = hour * 120; // 각 시간대별 위치

          return (
            <div
              key={`border-${hour}`}
              data-testid={`time-border-${hour}`}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: 0,
                width: '1px',
                height: '100%',
                backgroundColor: 'var(--color-border-grid)',
                opacity: 0.6,
                zIndex: 1,
              }}
            />
          );
        })}

        {/* 30분 구분선 */}
        {Array.from({ length: 30 }, (_, halfHour) => {
          const hourValue = Math.floor(halfHour / 2) + 9; // 9:00부터 시작
          const isHalfHour = halfHour % 2 === 1; // 30분인지 확인
          const left = (hourValue - 9) * 120 + (isHalfHour ? 60 : 0); // 각 30분별 위치

          return (
            <div
              key={`half-hour-border-${halfHour}`}
              data-testid={`half-hour-border-${halfHour}`}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: 0,
                width: '1px',
                height: '100%',
                backgroundColor: 'var(--color-border-grid-light)',
                opacity: 0.4,
                zIndex: 1,
              }}
            />
          );
        })}

        {/* 드롭 존들 - 각 시간대별로 */}
        {Array.from({ length: 15 }, (_, hour) => {
          const hourValue = hour + 9; // 9:00부터 시작
          return (
            <DropZone
              key={hour}
              hourIdx={hour}
              height={height}
              onDrop={e => {
                const enrollmentId = e.dataTransfer.getData('text/plain');
                if (enrollmentId) {
                  const timeString = `${hourValue.toString().padStart(2, '0')}:00`;
                  onDrop(weekday, timeString, enrollmentId);
                }
              }}
              onDragEnter={() => {}}
              onDragLeave={() => {}}
              onDragOver={e => e.preventDefault()}
              onClick={() => {
                const timeString = `${hourValue.toString().padStart(2, '0')}:00`;
                onEmptySpaceClick(weekday, timeString);
              }}
            />
          );
        })}

        {/* 세션 블록들 - 현재 요일과 일치하는 세션만 정확한 위치에 배치 */}
        {(sessions.get(weekday) || [])
          .filter(session => session.weekday === weekday) // 현재 요일과 일치하는 세션만 필터링
          .map(session => {
            // enrollmentId를 통해 올바른 subject 찾기
            const enrollment = enrollments.find(
              e => e.id === session.enrollmentId
            );
            const subject = subjects.find(s => s.id === enrollment?.subjectId);

            // 세션의 실제 시작 시간과 끝 시간을 기반으로 위치와 너비 계산
            const sessionStartMinutes =
              parseInt(session.startsAt.split(':')[0]) * 60 +
              parseInt(session.startsAt.split(':')[1]);
            const sessionEndMinutes =
              parseInt(session.endsAt.split(':')[0]) * 60 +
              parseInt(session.endsAt.split(':')[1]);
            const dayStartMinutes = 9 * 60; // 9:00

            const left = ((sessionStartMinutes - dayStartMinutes) / 60) * 120;
            const width =
              ((sessionEndMinutes - sessionStartMinutes) / 60) * 120;

            // yOffset 계산: sessionYPositions에서 미리 계산된 Y축 위치 사용
            const yPosition = sessionYPositions.get(session.id) || 0;
            const yOffset = yPosition * 32;

            console.log(
              `Rendering session: ${session.id} (${session.startsAt}-${session.endsAt}) on weekday ${weekday}, yPosition: ${yPosition}, left: ${left}, width: ${width}, yOffset: ${yOffset}`
            );

            return (
              <SessionBlock
                key={session.id}
                session={session}
                subject={subject || subjects[0]}
                left={left}
                width={width}
                yOffset={yOffset}
                onClick={() => {
                  console.log(
                    '🎯 TimeTableRow onClick triggered for session:',
                    session.id
                  );
                  onSessionClick(session);
                }}
              />
            );
          })}
      </div>
    </div>
  );
};

export default TimeTableRow;
