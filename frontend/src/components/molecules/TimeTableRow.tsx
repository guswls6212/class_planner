import React from 'react';
import type { Session, Subject } from '../../lib/planner';
import { timeToMinutes } from '../../lib/planner';
import DropZone from './DropZone';
import SessionBlock from './SessionBlock';

interface TimeTableRowProps {
  weekday: number;
  height: number;
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  getSessionPosition: (session: Session, weekday: number) => number;
  onSessionClick: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  height,
  sessions,
  subjects,
  enrollments,
  getSessionPosition,
  onSessionClick,
  onDrop,
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
          border: '1px solid var(--color-border)',
          gridColumn: '2 / -1', // 첫 번째 열(요일 라벨)을 제외한 모든 열 차지
        }}
      >
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
            />
          );
        })}

        {/* 세션 블록들 - 해당 요일의 모든 세션을 정확한 위치에 배치 */}
        {(sessions.get(weekday) || []).map(session => {
          const groupIndex = getSessionPosition(session, weekday);

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
          const width = ((sessionEndMinutes - sessionStartMinutes) / 60) * 120;

          // yOffset 계산: 그룹 인덱스 * 32 + 그룹 내 위치 * 32
          // 그룹 내 위치는 시작 시간 순으로 결정
          const daySessions = sessions.get(weekday) || [];
          const overlappingSessions = daySessions.filter(s => {
            if (s.id === session.id) return false;
            const sStart = timeToMinutes(s.startsAt);
            const sEnd = timeToMinutes(s.endsAt);
            const sessionStart = timeToMinutes(session.startsAt);
            const sessionEnd = timeToMinutes(session.endsAt);
            return sStart < sessionEnd && sessionStart < sEnd;
          });

          // 겹치는 세션이 없으면 그룹 인덱스만 사용
          if (overlappingSessions.length === 0) {
            const yOffset = groupIndex * 32;
            console.log(
              `Rendering session: ${session.id} (${session.startsAt}-${session.endsAt}) on weekday ${weekday}, groupIndex: ${groupIndex}, left: ${left}, width: ${width}, yOffset: ${yOffset} (no overlap)`
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
          }

          // 겹치는 세션이 있으면 그룹 내 위치도 계산
          const allOverlapping = [...overlappingSessions, session].sort(
            (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
          );
          const groupPosition = allOverlapping.findIndex(
            s => s.id === session.id
          );
          const yOffset = groupIndex * 32 + groupPosition * 32;

          console.log(
            `Rendering session: ${session.id} (${session.startsAt}-${session.endsAt}) on weekday ${weekday}, groupIndex: ${groupIndex}, groupPosition: ${groupPosition}, left: ${left}, width: ${width}, yOffset: ${yOffset}`
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
