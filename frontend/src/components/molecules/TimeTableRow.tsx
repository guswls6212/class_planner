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
  students: Array<{ id: string; name: string }>;
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
  students,
  sessionYPositions,
  onSessionClick,
  onDrop,
  onEmptySpaceClick,
  className = '',
  style = {},
}) => {
  // 🆕 시간을 분으로 변환하는 헬퍼 함수
  const timeToMinutes = React.useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  // 🆕 요일별 세션을 useMemo로 최적화
  const weekdaySessions = React.useMemo(() => {
    return sessions.get(weekday) || [];
  }, [sessions, weekday]);

  // 🆕 시간대별로 세션을 그룹화 (그룹 수업 고려)
  const sessionsByTime = React.useMemo(() => {
    const timeMap = new Map<string, Session[]>();

    weekdaySessions.forEach(session => {
      const timeKey = `${session.startsAt}-${session.endsAt}`;
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)!.push(session);
    });

    return timeMap;
  }, [weekdaySessions]);

  // 🆕 30분 단위 시간 슬롯 생성
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // 🆕 시간대별로 겹치는 세션들을 병합하여 표시
  const mergedSessions = React.useMemo(() => {
    const merged: Array<{
      session: Session;
      yPosition: number;
      left: number;
      width: number;
      yOffset: number;
    }> = [];

    sessionsByTime.forEach((sessionsInTime, timeKey) => {
      const [startTime] = timeKey.split('-');
      const timeSlot = timeToMinutes(startTime);
      // 🆕 30분 단위로 변경: 9:00 기준으로 30분 단위 인덱스 계산
      const timeIndex = (timeSlot - 9 * 60) / 30;
      const left = timeIndex * 60; // 30분당 60px

      // 🆕 같은 시간대의 세션들을 하나로 병합하여 표시
      if (sessionsInTime.length > 0) {
        const primarySession = sessionsInTime[0];
        const yPosition = sessionYPositions.get(primarySession.id) || 0;

        // 🆕 30분 단위로 변경: 기본 너비 60px, 1시간 수업은 120px
        const sessionDuration =
          timeToMinutes(primarySession.endsAt) -
          timeToMinutes(primarySession.startsAt);
        const width = sessionDuration >= 60 ? 120 : 60; // 1시간 이상이면 2칸(120px), 30분이면 1칸(60px)

        merged.push({
          session: primarySession,
          yPosition,
          left,
          width,
          yOffset: yPosition,
        });
      }
    });

    return merged;
  }, [sessionsByTime, sessionYPositions, timeToMinutes]);

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
        {['월', '화', '수', '목', '금', '토', '일'][weekday]}
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
        {/* 🆕 드롭 존들 - 30분 단위로 30개 */}
        {timeSlots30Min.map((timeString, index) => {
          return (
            <DropZone
              key={timeString}
              weekday={weekday}
              time={timeString}
              onDrop={onDrop}
              onEmptySpaceClick={onEmptySpaceClick}
              style={{
                position: 'absolute',
                top: 0,
                left: `${index * 60}px`, // 🆕 30분당 60px
                width: '60px', // 🆕 30분 단위 너비
                height: `${height}px`,
                zIndex: 1,
              }}
            />
          );
        })}

        {/* 세션 블록들 */}
        {mergedSessions.map(session => (
          <SessionBlock
            key={session.session.id}
            session={session.session}
            subjects={subjects.map(subject => ({
              ...subject,
              color: subject.color || '#000000', // 기본 색상 제공
            }))}
            enrollments={enrollments}
            students={students}
            yPosition={session.yPosition}
            left={session.left}
            width={session.width}
            yOffset={session.yOffset}
            onClick={() => onSessionClick(session.session)}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeTableRow;
