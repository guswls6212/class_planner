import React, { useCallback, useMemo } from 'react';
import type { Session, Subject } from '../../lib/planner';
import { timeToMinutes } from '../../lib/planner';
import TimeTableRow from '../molecules/TimeTableRow';

interface TimeTableGridProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  onSessionClick: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  sessions,
  subjects,
  enrollments,
  students,
  onSessionClick,
  onDrop,
  onEmptySpaceClick,
  className = '',
  style = {},
}) => {
  const hourCols = 24 - 9; // 9:00 ~ 24:00 (15시간)

  // 시간 슬롯을 useMemo로 최적화
  const timeSlots = useMemo(
    () => Array.from({ length: hourCols }, (_, i) => i + 9),
    [hourCols]
  );

  // 🚀 Phase 1: O(n log n) 세션 Y축 위치 계산 알고리즘
  const getSessionYPositions = useCallback(
    (weekday: number): Map<string, number> => {
      console.log(`\n=== Calculating Y positions for weekday ${weekday} ===`);

      // 현재 요일의 실제 세션들을 시작 시간 기준으로 정렬 (O(n log n))
      const daySessions = sessions.get(weekday) || [];
      const sortedSessions = [...daySessions].sort(
        (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
      );

      if (sortedSessions.length === 0) {
        console.log(`  No sessions for weekday ${weekday}`);
        return new Map();
      }

      // 겹침 판단 함수: 일부라도 겹치면 겹치는 것으로 판단
      const sessionsOverlap = (a: Session, b: Session): boolean => {
        return (
          timeToMinutes(a.startsAt) < timeToMinutes(b.endsAt) &&
          timeToMinutes(b.startsAt) < timeToMinutes(a.endsAt)
        );
      };

      // 각 세션의 Y축 위치를 계산
      const sessionYPositions = new Map<string, number>();

      for (let i = 0; i < sortedSessions.length; i++) {
        const currentSession = sortedSessions[i];

        // 현재 세션과 겹치는 이전 세션들의 최대 yPosition 찾기
        let maxOverlappingY = -1;

        for (let j = 0; j < i; j++) {
          const previousSession = sortedSessions[j];
          if (sessionsOverlap(currentSession, previousSession)) {
            const previousY = sessionYPositions.get(previousSession.id) || 0;
            maxOverlappingY = Math.max(maxOverlappingY, previousY);
          }
        }

        // 겹치는 세션이 있으면 그 다음 줄에 배치, 없으면 첫 번째 줄
        const yPosition = maxOverlappingY >= 0 ? maxOverlappingY + 32 : 0;
        sessionYPositions.set(currentSession.id, yPosition);

        // 디버깅을 위한 상세 로그
        console.log(
          `  Session ${currentSession.id} (${currentSession.startsAt}-${currentSession.endsAt}): Y position ${yPosition}`
        );
        if (maxOverlappingY >= 0) {
          console.log(
            `    Overlaps with previous sessions, placed at yPosition: ${yPosition}`
          );
        } else {
          console.log('    No overlap, placed at yPosition: 0');
        }
      }

      return sessionYPositions;
    },
    [sessions]
  );

  // 🚀 Phase 2: O(n log n) 겹침 계산 알고리즘
  const getWeekdayHeight = useCallback(
    (weekday: number): number => {
      const daySessions = sessions.get(weekday) || [];
      if (daySessions.length === 0) return 60; // 기본 높이

      // 실제 세션의 Y축 위치를 계산하여 최대 yPosition 찾기
      const sessionYPositions = getSessionYPositions(weekday);
      let maxYPosition = 0;

      for (const yPosition of sessionYPositions.values()) {
        maxYPosition = Math.max(maxYPosition, yPosition);
      }

      // 최대 yPosition + 세션 높이(32px) + 여백(28px) = 실제 필요한 높이
      const requiredHeight = maxYPosition + 32 + 28;
      const finalHeight = Math.max(60, requiredHeight);

      console.log(
        `Weekday ${weekday}: ${daySessions.length} sessions, max yPosition: ${maxYPosition}, required height: ${requiredHeight}, final height: ${finalHeight}`
      );

      return finalHeight;
    },
    [sessions, getSessionYPositions]
  );

  // 요일별 높이를 useMemo로 최적화
  const weekdayHeights = useMemo(
    () => Array.from({ length: 7 }, (_, i) => getWeekdayHeight(i)),
    [getWeekdayHeight]
  );

  // 그리드 템플릿 행을 useMemo로 최적화
  const gridTemplateRows = useMemo(
    () => `40px ${weekdayHeights.join('px ')}px`,
    [weekdayHeights]
  );

  // 그리드 템플릿 열을 useMemo로 최적화
  const gridTemplateColumns = useMemo(
    () => `80px repeat(${hourCols}, 120px)`,
    [hourCols]
  );

  return (
    <div
      className={`time-table-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns,
        gridTemplateRows,
        backgroundColor: 'var(--color-background)',
        border: '1px solid var(--color-border-grid)',
        borderRadius: '8px',
        overflow: 'auto',
        ...style,
      }}
    >
      {/* 좌상단 빈칸 */}
      <div style={{ backgroundColor: 'var(--color-background)' }} />

      {/* 시간 헤더 (X축 상단) */}
      {timeSlots.map((hour, index) => {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        const isLastHour = index === timeSlots.length - 1;
        return (
          <div
            key={hour}
            style={{
              backgroundColor: 'var(--color-background)',
              padding: '8px',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRight: isLastHour
                ? '1px solid var(--color-border)'
                : '1px solid var(--color-border-grid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
            }}
          >
            {timeString}
          </div>
        );
      })}

      {/* 요일별 행 (Y축 왼쪽) */}
      {Array.from({ length: 7 }, (_, weekday) => {
        const sessionYPositions = getSessionYPositions(weekday);
        return (
          <TimeTableRow
            key={weekday}
            weekday={weekday}
            height={weekdayHeights[weekday]}
            sessions={sessions}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            sessionYPositions={sessionYPositions}
            onSessionClick={onSessionClick}
            onDrop={onDrop}
            onEmptySpaceClick={onEmptySpaceClick}
          />
        );
      })}
    </div>
  );
};

export default TimeTableGrid;
