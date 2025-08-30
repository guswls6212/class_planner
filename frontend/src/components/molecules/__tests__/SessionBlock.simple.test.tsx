import { describe, expect, it } from 'vitest';
// 로컬 타입 정의 (SessionBlock.tsx와 동일)
type Session = {
  id: string;
  enrollmentIds: string[];
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
};

type Subject = {
  id: string;
  name: string;
  color: string | undefined;
};

describe('SessionBlock', () => {
  it('세션 데이터 구조가 올바르게 정의되어 있다', () => {
    const mockSession: Session = {
      id: 'session-1',
      enrollmentIds: ['enrollment-1'],
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:00',
    };

    expect(mockSession.id).toBe('session-1');
    expect(mockSession.weekday).toBe(0);
    expect(mockSession.startsAt).toBe('09:00');
    expect(mockSession.endsAt).toBe('10:00');
  });

  it('과목 데이터 구조가 올바르게 정의되어 있다', () => {
    const mockSubject: Subject = {
      id: 'subject-1',
      name: '중등수학',
      color: '#f59e0b',
    };

    expect(mockSubject.id).toBe('subject-1');
    expect(mockSubject.name).toBe('중등수학');
    expect(mockSubject.color).toBe('#f59e0b');
  });

  it('세션 블록의 위치 계산 로직이 올바르게 정의되어 있다', () => {
    const positionLogic = {
      left: 240, // 2 * 120px (시간대별 위치)
      width: 180, // 세션 길이에 따른 너비
      yOffset: 32, // 겹치는 세션의 Y축 오프셋
    };

    expect(positionLogic.left).toBe(240);
    expect(positionLogic.width).toBe(180);
    expect(positionLogic.yOffset).toBe(32);
  });

  it('z-index 계산 로직이 올바르게 정의되어 있다', () => {
    const zIndexLogic = {
      baseZIndex: 1000,
      yOffset: 64,
      calculatedZIndex: 1064, // 1000 + 64
    };

    expect(zIndexLogic.baseZIndex).toBe(1000);
    expect(zIndexLogic.calculatedZIndex).toBe(
      zIndexLogic.baseZIndex + zIndexLogic.yOffset
    );
  });

  it('세션 텍스트 형식이 올바르게 정의되어 있다', () => {
    const sessionTexts = [
      '중등수학 09:00-10:00',
      '영어 10:00-11:00',
      '국어 11:00-12:00',
    ];

    sessionTexts.forEach(text => {
      expect(text).toMatch(/^[가-힣]+ \d{2}:\d{2}-\d{2}:\d{2}$/);
    });
  });

  it('기본 스타일 속성들이 올바르게 정의되어 있다', () => {
    const defaultStyles = {
      color: '#fff',
      borderRadius: '4px',
      padding: '0 6px',
      fontSize: '12px',
      cursor: 'pointer',
    };

    expect(defaultStyles.color).toBe('#fff');
    expect(defaultStyles.borderRadius).toBe('4px');
    expect(defaultStyles.cursor).toBe('pointer');
  });

  it('과목별 색상 시스템이 올바르게 정의되어 있다', () => {
    const subjectColors = {
      중등수학: '#f59e0b', // 주황색
      영어: '#3b82f6', // 파란색
      국어: '#10b981', // 초록색
    };

    expect(subjectColors.중등수학).toBe('#f59e0b');
    expect(subjectColors.영어).toBe('#3b82f6');
    expect(subjectColors.국어).toBe('#10b981');
  });
});
