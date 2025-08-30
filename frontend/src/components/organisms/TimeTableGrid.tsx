import React, { forwardRef, useCallback, useMemo } from 'react';
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
  ref?: React.Ref<HTMLDivElement>;
}

const TimeTableGrid = forwardRef<HTMLDivElement, TimeTableGridProps>(
  (
    {
      sessions,
      subjects,
      enrollments,
      students,
      onSessionClick,
      onDrop,
      onEmptySpaceClick,
      className = '',
      style = {},
    },
    ref
  ) => {
    // 🆕 30분 단위로 변경: 9:00 ~ 24:00 (30개 열)
    const timeSlots30Min = useMemo(() => {
      const slots: string[] = [];
      for (let hour = 9; hour < 24; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      return slots;
    }, []);

    const timeCols = timeSlots30Min.length; // 30개 열

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

          // 🆕 겹치는 세션이 있으면 그 다음 줄에 배치, 없으면 첫 번째 줄
          // 세션 셀 높이를 동적으로 계산: 과목명(11px) + 학생명(10px) + 시간(9px) + margin(3px) = 33px
          const sessionHeight = 33; // 🆕 실제 세션 블록 높이
          const yPosition =
            maxOverlappingY >= 0 ? maxOverlappingY + sessionHeight : 0;
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

    // 🆕 요일별 높이 계산: 기본 33px + 겹침당 33px
    const getWeekdayHeight = useCallback(
      (weekday: number): number => {
        const sessionYPositions = getSessionYPositions(weekday);
        const daySessions = sessions.get(weekday) || [];

        if (daySessions.length === 0) {
          return 33; // 🆕 기본 높이를 33px로 줄임
        }

        // 최대 yPosition을 찾아서 필요한 높이 계산
        let maxYPosition = 0;
        for (const yPos of sessionYPositions.values()) {
          maxYPosition = Math.max(maxYPosition, yPos);
        }

        // 🆕 기본 높이 33px + 최대 yPosition + 세션 셀 높이 33px
        const requiredHeight = Math.max(33, maxYPosition + 33);
        const finalHeight = Math.max(requiredHeight, 33);

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

    // 🆕 그리드 템플릿 열을 30분 단위로 변경: 80px + 30개 × 60px
    const gridTemplateColumns = useMemo(
      () => `80px repeat(${timeCols}, 60px)`,
      [timeCols]
    );

    return (
      <div
        ref={ref}
        className={`time-table-grid ${className}`}
        data-testid="time-table-grid"
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

        {/* 🆕 시간 헤더 (X축 상단) - 30분 단위 */}
        {timeSlots30Min.map((timeString, index) => {
          const isLastTime = index === timeSlots30Min.length - 1;
          return (
            <div
              key={timeString}
              style={{
                backgroundColor: 'var(--color-background)',
                padding: '4px', // 🆕 패딩을 줄여서 30분 단위에 맞춤
                textAlign: 'center',
                fontSize: '11px', // 🆕 폰트 크기를 줄여서 30분 단위에 맞춤
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRight: isLastTime
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
  }
);

export { TimeTableGrid };
export default TimeTableGrid;
