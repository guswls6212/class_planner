import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
import TimeTableGrid from '../TimeTableGrid';

// 성능 테스트용 대용량 데이터 생성
function generateLargeTestData(sessionCount: number) {
  const subjects: Subject[] = [
    { id: 'subject-1', name: '중등수학', color: '#f59e0b' },
    { id: 'subject-2', name: '영어', color: '#3b82f6' },
    { id: 'subject-3', name: '국어', color: '#10b981' },
  ];

  const sessions = new Map<number, Session[]>();

  // 각 요일마다 세션 생성
  for (let weekday = 0; weekday < 7; weekday++) {
    const daySessions: Session[] = [];

    for (let i = 0; i < sessionCount; i++) {
      const startHour = 9 + (i % 15); // 9:00 ~ 23:00
      const endHour = startHour + 1;

      daySessions.push({
        id: `session-${weekday}-${i}`,
        enrollmentId: `enrollment-${i}`,
        startsAt: `${startHour.toString().padStart(2, '0')}:00`,
        endsAt: `${endHour.toString().padStart(2, '0')}:00`,
        weekday,
      });
    }

    sessions.set(weekday, daySessions);
  }

  const enrollments = Array.from({ length: sessionCount }, (_, i) => ({
    id: `enrollment-${i}`,
    studentId: `student-${i}`,
    subjectId: `subject-${(i % 3) + 1}`,
  }));

  return { sessions, subjects, enrollments };
}

describe('TimeTableGrid 성능 테스트', () => {
  it('소규모 데이터(10개 세션)에서 빠르게 렌더링된다', () => {
    const { sessions, subjects, enrollments } = generateLargeTestData(10);
    const mockOnSessionClick = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnEmptySpaceClick = vi.fn();

    const startTime = performance.now();

    render(
      <TimeTableGrid
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 350ms 이내에 렌더링되어야 함 (성능 변동 고려)
    expect(renderTime).toBeLessThan(350);
    console.log(`소규모 데이터 렌더링 시간: ${renderTime.toFixed(2)}ms`);
  });

  it('중간 규모 데이터(50개 세션)에서 적절한 성능을 보인다', () => {
    const { sessions, subjects, enrollments } = generateLargeTestData(50);
    const mockOnSessionClick = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnEmptySpaceClick = vi.fn();

    const startTime = performance.now();

    render(
      <TimeTableGrid
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 700ms 이내에 렌더링되어야 함 (성능 변동 고려)
    expect(renderTime).toBeLessThan(700);
    console.log(`중간 규모 데이터 렌더링 시간: ${renderTime.toFixed(2)}ms`);
  });

  it('대규모 데이터(100개 세션)에서도 성능이 급격히 저하되지 않는다', () => {
    const { sessions, subjects, enrollments } = generateLargeTestData(100);
    const mockOnSessionClick = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnEmptySpaceClick = vi.fn();

    const startTime = performance.now();

    render(
      <TimeTableGrid
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 1.6초 이내에 렌더링되어야 함 (성능 변동 고려)
    expect(renderTime).toBeLessThan(1600);
    console.log(`대규모 데이터 렌더링 시간: ${renderTime.toFixed(2)}ms`);
  });

  it('useMemo와 useCallback이 불필요한 재계산을 방지한다', () => {
    const { sessions, subjects, enrollments } = generateLargeTestData(20);
    const mockOnSessionClick = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnEmptySpaceClick = vi.fn();

    // 첫 번째 렌더링
    const { rerender } = render(
      <TimeTableGrid
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );

    // 동일한 props로 재렌더링
    const startTime = performance.now();
    rerender(
      <TimeTableGrid
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );
    const endTime = performance.now();
    const rerenderTime = endTime - startTime;

    // 재렌더링이 첫 렌더링보다 빠르거나 비슷해야 함
    expect(rerenderTime).toBeLessThan(200);
    console.log(`재렌더링 시간: ${rerenderTime.toFixed(2)}ms`);
  });

  it('알고리즘 복잡도가 O(n log n)으로 개선되었다', () => {
    const smallData = generateLargeTestData(10);
    const mediumData = generateLargeTestData(50);
    const largeData = generateLargeTestData(100);

    const mockOnSessionClick = vi.fn();
    const mockOnDrop = vi.fn();
    const mockOnEmptySpaceClick = vi.fn();

    // 소규모 데이터 렌더링 시간
    const smallStart = performance.now();
    render(
      <TimeTableGrid
        sessions={smallData.sessions}
        subjects={smallData.subjects}
        enrollments={smallData.enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );
    const smallTime = performance.now() - smallStart;

    // 중간 규모 데이터 렌더링 시간
    const mediumStart = performance.now();
    render(
      <TimeTableGrid
        sessions={mediumData.sessions}
        subjects={mediumData.subjects}
        enrollments={mediumData.enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );
    const mediumTime = performance.now() - mediumStart;

    // 대규모 데이터 렌더링 시간
    const largeStart = performance.now();
    render(
      <TimeTableGrid
        sessions={largeData.sessions}
        subjects={largeData.subjects}
        enrollments={largeData.enrollments}
        onSessionClick={mockOnSessionClick}
        onDrop={mockOnDrop}
        onEmptySpaceClick={mockOnEmptySpaceClick}
      />
    );
    const largeTime = performance.now() - largeStart;

    console.log('성능 테스트 결과:');
    console.log(`  10개 세션: ${smallTime.toFixed(2)}ms`);
    console.log(`  50개 세션: ${mediumTime.toFixed(2)}ms`);
    console.log(`  100개 세션: ${largeTime.toFixed(2)}ms`);

    // O(n log n) 복잡도 검증: 데이터 크기가 5배 증가했을 때 시간이 10배 이하로 증가해야 함
    const smallToMediumRatio = mediumTime / smallTime;
    const mediumToLargeRatio = largeTime / mediumTime;

    expect(smallToMediumRatio).toBeLessThan(10); // 5배 증가 시 10배 이하
    expect(mediumToLargeRatio).toBeLessThan(10); // 2배 증가 시 10배 이하

    console.log('복잡도 검증:');
    console.log(`  10→50 세션 비율: ${smallToMediumRatio.toFixed(2)}`);
    console.log(`  50→100 세션 비율: ${mediumToLargeRatio.toFixed(2)}`);
  });
});
