import React, { useCallback, useMemo } from 'react';
import type { Session, Subject } from '../../lib/planner';
import { timeToMinutes } from '../../lib/planner';
import TimeTableRow from '../molecules/TimeTableRow';

interface TimeTableGridProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
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

  // 🚀 Phase 2: O(n log n) Y축 위치 할당 알고리즘
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

      // 각 세션의 Y축 위치를 계산
      const sessionYPositions = new Map<string, number>();
      const activeTracks: number[] = []; // 현재 활성 트랙들의 종료 시간

      for (const session of sortedSessions) {
        const sessionStart = timeToMinutes(session.startsAt);
        const sessionEnd = timeToMinutes(session.endsAt);

        // 현재 시간에 종료된 트랙들을 제거
        while (activeTracks.length > 0 && activeTracks[0] <= sessionStart) {
          activeTracks.shift();
        }

        // 사용 가능한 트랙 찾기
        let trackIndex = 0;
        for (; trackIndex < activeTracks.length; trackIndex++) {
          if (sessionStart >= activeTracks[trackIndex]) {
            // 이 트랙에 배치 가능
            activeTracks[trackIndex] = sessionEnd;
            break;
          }
        }

        // 사용 가능한 트랙이 없으면 새로운 트랙 생성
        if (trackIndex === activeTracks.length) {
          activeTracks.push(sessionEnd);
        }

        // Y축 위치 할당 (트랙 인덱스 * 32)
        const yPosition = trackIndex;
        sessionYPositions.set(session.id, yPosition);

        console.log(
          `  Session ${session.id} (${session.startsAt}-${session.endsAt}): assigned to track ${trackIndex}, Y position ${yPosition}`
        );
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

      // 세션들을 시작 시간 기준으로 정렬 (O(n log n))
      const sortedSessions = [...daySessions].sort(
        (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
      );

      // 겹치는 세션 그룹을 효율적으로 계산 (O(n log n))
      let maxOverlap = 1;
      const activeSessions: number[] = []; // 현재 활성 세션들의 종료 시간

      for (const session of sortedSessions) {
        const sessionStart = timeToMinutes(session.startsAt);
        const sessionEnd = timeToMinutes(session.endsAt);

        // 현재 시간에 종료된 세션들을 제거
        while (activeSessions.length > 0 && activeSessions[0] <= sessionStart) {
          activeSessions.shift();
        }

        // 현재 세션 추가
        activeSessions.push(sessionEnd);

        // activeSessions 배열을 종료 시간 기준으로 정렬 유지 (삽입 정렬)
        activeSessions.sort((a, b) => a - b);

        // 현재 겹침 수 업데이트
        maxOverlap = Math.max(maxOverlap, activeSessions.length);
      }

      console.log(
        `Weekday ${weekday}: ${daySessions.length} sessions, max overlap: ${maxOverlap}, height: ${Math.max(60, 60 + (maxOverlap - 1) * 32)}`
      );

      return Math.max(60, 60 + (maxOverlap - 1) * 32);
    },
    [sessions]
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
