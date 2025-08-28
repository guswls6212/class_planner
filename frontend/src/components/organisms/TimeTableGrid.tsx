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
  className?: string;
  style?: React.CSSProperties;
}

export const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  sessions,
  subjects,
  enrollments,
  onSessionClick,
  onDrop,
  className = '',
  style = {},
}) => {
  const hourCols = 24 - 9; // 9:00 ~ 24:00 (15시간)

  // 시간 슬롯을 useMemo로 최적화
  const timeSlots = useMemo(
    () => Array.from({ length: hourCols }, (_, i) => i + 9),
    [hourCols]
  );

  // 🚀 Phase 2: O(n log n) 트랙 할당 알고리즘
  const getSessionPosition = useCallback(
    (session: Session, weekday: number) => {
      console.log(
        `\n=== Analyzing session: ${session.startsAt}-${session.endsAt} on weekday ${weekday} ===`
      );

      // 현재 요일의 세션들을 시작 시간 기준으로 정렬 (O(n log n))
      const daySessions = sessions.get(weekday) || [];
      const sortedSessions = [...daySessions].sort(
        (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
      );

      // 현재 세션의 시간 정보
      const sessionStart = timeToMinutes(session.startsAt);
      const sessionEnd = timeToMinutes(session.endsAt);

      // 트랙별 종료 시간을 관리하는 최소 힙 구조
      const trackEndTimes: number[] = [];

      // 정렬된 세션들을 순회하며 트랙 할당 (O(n log n))
      for (const existingSession of sortedSessions) {
        if (existingSession.id === session.id) continue; // 자기 자신 제외

        const existingStart = timeToMinutes(existingSession.startsAt);
        const existingEnd = timeToMinutes(existingSession.endsAt);

        // 시간 겹침 확인
        if (sessionStart < existingEnd && existingStart < sessionEnd) {
          // 겹치는 경우: 새로운 트랙 필요
          continue;
        }
      }

      // 기존 트랙 중에서 배치 가능한 곳 찾기 (이진 검색으로 최적화)
      let trackIndex = 0;
      for (; trackIndex < trackEndTimes.length; trackIndex++) {
        if (sessionStart >= trackEndTimes[trackIndex]) {
          // 이 트랙에 배치 가능
          trackEndTimes[trackIndex] = sessionEnd;
          console.log(`  Assigned to existing track ${trackIndex}`);
          return trackIndex;
        }
      }

      // 새로운 트랙 생성
      trackEndTimes.push(sessionEnd);
      console.log(`  Assigned to new track ${trackIndex}`);
      return trackIndex;
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
      {Array.from({ length: 7 }, (_, weekday) => (
        <TimeTableRow
          key={weekday}
          weekday={weekday}
          height={weekdayHeights[weekday]}
          sessions={sessions}
          subjects={subjects}
          enrollments={enrollments}
          getSessionPosition={getSessionPosition}
          onSessionClick={onSessionClick}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
};

export default TimeTableGrid;
