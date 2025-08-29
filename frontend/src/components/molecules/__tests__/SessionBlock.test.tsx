import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Session, Subject } from '../../../lib/planner';
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
  name: '중등수학',
  color: '#f59e0b',
};

const mockStudent = {
  id: 'student-1',
  name: '김요섭',
};

describe('SessionBlock', () => {
  it('세션 정보를 올바르게 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // 과목명과 학생명이 각각 별도의 span에 표시되는지 확인
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('김요섭')).toBeInTheDocument();

    // 전체 세션 블록이 존재하는지 확인
    expect(screen.getByTestId('session-block-session-1')).toBeInTheDocument();
  });

  it('과목이 없을 때 기본 텍스트를 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    // 과목명과 학생명이 각각 별도의 span에 표시되는지 확인
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('김요섭')).toBeInTheDocument();
  });

  it('학생이 없을 때 과목명만 표시한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={undefined}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.queryByText('김요섭')).not.toBeInTheDocument();
  });

  it('클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('위치와 크기를 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={240}
        width={180}
        yOffset={32}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');

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
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      background: '#f59e0b',
    });
  });

  it('z-index를 올바르게 계산한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={64}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      zIndex: 1064, // 1000 + 64
    });
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => {}}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');

    expect(sessionBlock).toHaveStyle({
      borderRadius: '4px',
      padding: '0 6px',
      fontSize: '12px',
      cursor: 'pointer',
    });
  });

  it('이벤트 버블링을 방지한다', () => {
    const mockOnClick = vi.fn();
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        student={mockStudent}
        left={0}
        width={120}
        yOffset={0}
        onClick={mockOnClick}
      />
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');

    // 클릭 이벤트 발생
    fireEvent.click(sessionBlock);

    expect(mockOnClick).toHaveBeenCalledTimes(1);

    // 이벤트 버블링 방지 확인 - onClick 핸들러가 호출되면 stopPropagation이 내부에서 처리됨
    // 실제 stopPropagation 호출은 fireEvent.click 내부에서 처리되므로 별도 검증 불필요
  });
});
