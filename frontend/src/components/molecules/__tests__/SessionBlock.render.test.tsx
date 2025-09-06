import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionBlock from '../SessionBlock';

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
  color: string;
};

// Mock 데이터
const mockSubject: Subject = {
  id: 'subject-1',
  name: '중등수학',
  color: '#f59e0b',
};

const mockStudent = {
  id: 'student-1',
  name: '김요섭',
};

const mockSession: Session = {
  id: 'session-1',
  enrollmentIds: ['enrollment-1'],
  startsAt: '09:00',
  endsAt: '10:00',
  weekday: 1,
};

// Mock props
const mockProps = {
  left: 100,
  width: 120,
  yOffset: 0,
  yPosition: 0,
  subjects: [mockSubject],
  enrollments: [
    {
      id: 'enrollment-1',
      studentId: 'student-1',
      subjectId: 'subject-1',
    },
  ],
  students: [mockStudent],
};

describe('SessionBlock 렌더링 테스트', () => {
  it('세션 정보를 올바르게 렌더링한다', () => {
    const mockOnClick = vi.fn();

    render(
      <SessionBlock
        session={mockSession}
        onClick={mockOnClick}
        {...mockProps}
      />,
    );

    // 세션 정보가 올바르게 렌더링되어야 함
    expect(screen.getByText('중등수학')).toBeInTheDocument();
    expect(screen.getByText('김요섭')).toBeInTheDocument();
  });

  it('클릭 이벤트를 올바르게 처리한다', () => {
    const mockOnClick = vi.fn();

    render(
      <SessionBlock
        session={mockSession}
        onClick={mockOnClick}
        {...mockProps}
      />,
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    expect(mockOnClick).toHaveBeenCalled();
  });

  it('과목별 색상을 올바르게 적용한다', () => {
    const mockOnClick = vi.fn();

    render(
      <SessionBlock
        session={mockSession}
        onClick={mockOnClick}
        {...mockProps}
      />,
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      background: 'rgb(245, 158, 11)', // #f59e0b
    });
  });

  it('커스텀 스타일을 올바르게 병합한다', () => {
    const mockOnClick = vi.fn();

    render(
      <SessionBlock
        session={mockSession}
        onClick={mockOnClick}
        {...mockProps}
      />,
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');
    expect(sessionBlock).toHaveStyle({
      border: '1px solid rgba(255, 255, 255, 0.2)',
    });
  });

  it('기본 스타일 속성들을 올바르게 적용한다', () => {
    const mockOnClick = vi.fn();

    render(
      <SessionBlock
        session={mockSession}
        onClick={mockOnClick}
        {...mockProps}
      />,
    );

    const sessionBlock = screen.getByTestId('session-block-session-1');

    // 기본 스타일 확인
    expect(sessionBlock).toHaveStyle({
      position: 'absolute',
      borderRadius: '4px',
      padding: '0px', // 🆕 padding을 완전히 제거
      cursor: 'pointer',
    });
  });

  it('여러 세션을 올바르게 렌더링한다', () => {
    const mockOnClick = vi.fn();
    const sessions = [
      { ...mockSession, id: 'session-1', startsAt: '09:00', endsAt: '10:00' },
      { ...mockSession, id: 'session-2', startsAt: '10:00', endsAt: '11:00' },
      { ...mockSession, id: 'session-3', startsAt: '11:00', endsAt: '12:00' },
    ];

    sessions.forEach(session => {
      const { unmount } = render(
        <SessionBlock session={session} onClick={mockOnClick} {...mockProps} />,
      );

      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.getByText('김요섭')).toBeInTheDocument();
      unmount();
    });
  });
});
