import { timeToMinutes } from '../../../lib/planner';

// 겹침 판단 함수 (TimeTableGrid에서 사용하는 로직과 동일)
const sessionsOverlap = (
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string }
): boolean => {
  return (
    timeToMinutes(a.startsAt) < timeToMinutes(b.endsAt) &&
    timeToMinutes(b.startsAt) < timeToMinutes(a.endsAt)
  );
};

describe('겹침 판단 로직 테스트', () => {
  test('완전히 겹치는 세션들', () => {
    const session1 = { startsAt: '09:00', endsAt: '10:00' };
    const session2 = { startsAt: '09:30', endsAt: '10:30' };

    expect(sessionsOverlap(session1, session2)).toBe(true);
    expect(sessionsOverlap(session2, session1)).toBe(true);
  });

  test('부분적으로 겹치는 세션들', () => {
    const session1 = { startsAt: '09:00', endsAt: '10:00' };
    const session2 = { startsAt: '09:45', endsAt: '10:45' };

    expect(sessionsOverlap(session1, session2)).toBe(true);
    expect(sessionsOverlap(session2, session1)).toBe(true);
  });

  test('겹치지 않는 세션들 (시간이 맞닿음)', () => {
    const session1 = { startsAt: '09:00', endsAt: '10:00' };
    const session2 = { startsAt: '10:00', endsAt: '11:00' };

    expect(sessionsOverlap(session1, session2)).toBe(false);
    expect(sessionsOverlap(session2, session1)).toBe(false);
  });

  test('겹치지 않는 세션들 (시간 간격 있음)', () => {
    const session1 = { startsAt: '09:00', endsAt: '10:00' };
    const session2 = { startsAt: '11:00', endsAt: '12:00' };

    expect(sessionsOverlap(session1, session2)).toBe(false);
    expect(sessionsOverlap(session2, session1)).toBe(false);
  });

  test('같은 시간에 시작하는 세션들', () => {
    const session1 = { startsAt: '09:00', endsAt: '10:00' };
    const session2 = { startsAt: '09:00', endsAt: '11:00' };

    expect(sessionsOverlap(session1, session2)).toBe(true);
    expect(sessionsOverlap(session2, session1)).toBe(true);
  });

  test('같은 시간에 끝나는 세션들', () => {
    const session1 = { startsAt: '08:00', endsAt: '10:00' };
    const session2 = { startsAt: '09:00', endsAt: '10:00' };

    expect(sessionsOverlap(session1, session2)).toBe(true);
    expect(sessionsOverlap(session2, session1)).toBe(true);
  });

  test('하나가 다른 하나를 완전히 포함하는 경우', () => {
    const session1 = { startsAt: '08:00', endsAt: '12:00' };
    const session2 = { startsAt: '09:00', endsAt: '11:00' };

    expect(sessionsOverlap(session1, session2)).toBe(true);
    expect(sessionsOverlap(session2, session1)).toBe(true);
  });

  test('경계값 테스트 (30분 단위)', () => {
    const session1 = { startsAt: '09:00', endsAt: '09:30' };
    const session2 = { startsAt: '09:30', endsAt: '10:00' };

    expect(sessionsOverlap(session1, session2)).toBe(false);
    expect(sessionsOverlap(session2, session1)).toBe(false);
  });

  test('경계값 테스트 (15분 단위)', () => {
    const session1 = { startsAt: '09:00', endsAt: '09:15' };
    const session2 = { startsAt: '09:15', endsAt: '09:30' };

    expect(sessionsOverlap(session1, session2)).toBe(false);
    expect(sessionsOverlap(session2, session1)).toBe(false);
  });
});
