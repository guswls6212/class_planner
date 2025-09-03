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
  selectedStudentId?: string; // 🆕 선택된 학생 ID 추가
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
  selectedStudentId, // 🆕 선택된 학생 ID 추가
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

      // 🆕 정확한 시간 기반 위치 계산 (소수점 제거)
      const timeIndex = (timeSlot - 9 * 60) / 30;
      const left = Math.round(timeIndex * 100); // 🆕 Math.round로 소수점 제거

      // 🆕 같은 시간대의 모든 세션을 개별적으로 표시
      sessionsInTime.forEach((session, index) => {
        const yPosition = sessionYPositions.get(session.id) || 0;

        // 🆕 세션셀 너비를 실제 시간 길이에 맞게 계산 (소수점 제거)
        const sessionDuration =
          timeToMinutes(session.endsAt) - timeToMinutes(session.startsAt);
        const timeBasedWidth = Math.round((sessionDuration / 30) * 100); // 🆕 Math.round로 소수점 제거

        // 🆕 정확한 시간 기반 너비 사용
        const width = Math.max(timeBasedWidth, 50); // 🆕 최소 너비 50px 보장

        console.log('🔍 세션 위치 계산:', {
          sessionId: session.id,
          startTime: session.startsAt,
          endTime: session.endsAt,
          timeIndex,
          left,
          width,
          timeBasedWidth,
          yPosition,
          index,
        });

        merged.push({
          session: session,
          yPosition,
          left,
          width,
          yOffset: yPosition,
        });
      });
    });

    return merged;
  }, [sessionsByTime, sessionYPositions, timeToMinutes]);

  return (
    <div
      className={`time-table-row ${className}`}
      style={{
        display: 'contents', // 🆕 다시 contents로 변경 (부모 그리드에 직접 참여)
        ...style,
      }}
    >
      {/* 🆕 디버깅: 요일별 세션 데이터 확인 */}
      {(() => {
        console.log('🔍 TimeTableRow 렌더링:', {
          weekday,
          weekdaySessions: weekdaySessions.length,
          sessions: weekdaySessions.map(s => ({
            id: s.id,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
          })),
          mergedSessions: mergedSessions.length,
          mergedSessionsData: mergedSessions.map(s => ({
            sessionId: s.session.id,
            startsAt: s.session.startsAt,
            endsAt: s.session.endsAt,
            left: s.left,
            width: s.width,
            yPosition: s.yPosition,
          })),
        });
        return null;
      })()}

      {/* 요일 라벨 (Y축 왼쪽) - 고정 */}
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
          position: 'sticky',
          left: 0,
          zIndex: 10,
          gridColumn: '1', // 🆕 첫 번째 열에 명시적으로 배치
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
          gridColumn: '2 / -1', // 🆕 첫 번째 열(요일 라벨)을 제외한 모든 열 차지
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
                left: `${index * 100}px`, // 🆕 30분당 100px
                width: '100px', // 🆕 30분 단위 너비
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
            selectedStudentId={selectedStudentId}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeTableRow;
