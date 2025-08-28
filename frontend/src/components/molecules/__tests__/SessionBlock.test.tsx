import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../lib/planner';
import SessionBlock from '../SessionBlock';

// Mock 데이터
const mockSession: Session = {
  id: 'session-1',
  enrollmentId: 'enrollment-1',
  weekday: 0,
  startsAt: '09:00',
  endsAt: '10:00',
};

const mockSubject: Subject = {
  id: 'subject-1',
  name: '수학',
  color: '#f59e0b',
};

describe('SessionBlock', () => {
  it('세션 정보를 올바르게 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('수학 09:00-10:00')).toBeInTheDocument();
  });

  it('과목이 없을 때 기본 텍스트를 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={undefined}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Unknown 09:00-10:00')).toBeInTheDocument();
  });

  it('클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');
    fireEvent.click(sessionBlock);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('위치와 크기를 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={240}
        width={180}
        yOffset={32}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');

    expect(sessionBlock).toHaveStyle({
      position: 'absolute',
      left: '240px',
      top: '38px', // 6 + 32
      width: '180px',
      height: '28px',
    });
  });

  it('과목 색상을 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');
    expect(sessionBlock).toHaveStyle({
      background: '#f59e0b',
    });
  });

  it('z-index를 올바르게 계산한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={64}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');
    expect(sessionBlock).toHaveStyle({
      zIndex: 1064, // 1000 + 64
    });
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');

    expect(sessionBlock).toHaveStyle({
      color: '#fff',
      borderRadius: '4px',
      padding: '0 6px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer',
    });
  });

  it('이벤트 버블링을 방지한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByText('수학 09:00-10:00');
    const clickEvent = new MouseEvent('click', { bubbles: true });

    fireEvent(sessionBlock, clickEvent);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
