import React from 'react';
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
  const timeSlots = Array.from({ length: hourCols }, (_, i) => i + 9); // 9부터 시작

  // 시간별로 겹치는 세션을 y축으로 배치하는 함수
  function getSessionPosition(session: Session, weekday: number) {
    // 디버깅: 현재 세션 정보
    console.log(
      `\n=== Analyzing session: ${session.startsAt}-${session.endsAt} on weekday ${weekday} ===`
    );

    // 트랙 기반 배치 시스템: 시간이 겹치지 않는 세션들은 같은 트랙에 배치
    function assignTrackIndex(targetSession: Session): number {
      const sessionStart = timeToMinutes(targetSession.startsAt);
      const sessionEnd = timeToMinutes(targetSession.endsAt);

      // 기존 트랙들 중에서 현재 세션을 배치할 수 있는 곳 찾기
      for (
        let trackIndex = 0;
        trackIndex < trackEndTimes.length;
        trackIndex++
      ) {
        if (sessionStart >= trackEndTimes[trackIndex]) {
          // 이 트랙에 배치 가능 (시간이 겹치지 않음)
          console.log(
            `  Assigned to track ${trackIndex} (no overlap with existing session)`
          );
          // 트랙의 종료 시간 업데이트
          trackEndTimes[trackIndex] = sessionEnd;
          return trackIndex;
        }
      }

      // 새로운 트랙 생성
      const newTrackIndex = trackEndTimes.length;
      trackEndTimes.push(sessionEnd);
      console.log(
        `  Assigned to new track ${newTrackIndex} (overlaps with all existing tracks)`
      );
      return newTrackIndex;
    }

    // 트랙별 종료 시간을 추적하는 배열
    const trackEndTimes: number[] = [];

    const trackIndex = assignTrackIndex(session);
    console.log(`  Final result: track ${trackIndex}`);
    console.log(`=== End analysis ===\n`);

    return trackIndex;
  }

  // 각 요일별로 필요한 높이를 계산하는 함수
  function getWeekdayHeight(weekday: number): number {
    const daySessions = sessions.get(weekday) || [];
    if (daySessions.length === 0) return 60; // 기본 높이

    // 겹치는 세션 그룹을 찾아서 최대 겹침 수 계산
    const maxOverlap = Math.max(
      ...daySessions.map(session => {
        const overlappingSessions = daySessions.filter(s => {
          if (s.id === session.id) return false;
          const sStart = timeToMinutes(s.startsAt);
          const sEnd = timeToMinutes(s.endsAt);
          const sessionStart = timeToMinutes(session.startsAt);
          const sessionEnd = timeToMinutes(session.endsAt);
          return sStart < sessionEnd && sessionStart < sEnd;
        });
        return overlappingSessions.length + 1; // 자기 자신 포함
      })
    );

    // 디버깅 로그
    console.log(
      `Weekday ${weekday}: ${daySessions.length} sessions, max overlap: ${maxOverlap}, height: ${Math.max(60, 60 + (maxOverlap - 1) * 32)}`
    );

    // 기본 높이 60px + 겹치는 세션당 32px 추가
    return Math.max(60, 60 + (maxOverlap - 1) * 32);
  }

  return (
    <div
      className={`time-table-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `80px repeat(${hourCols}, 120px)`,
        gridTemplateRows: `40px ${Array.from({ length: 7 }, (_, i) => getWeekdayHeight(i)).join('px ')}px`,
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
      {timeSlots.map(hour => {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
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
          height={getWeekdayHeight(weekday)}
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
