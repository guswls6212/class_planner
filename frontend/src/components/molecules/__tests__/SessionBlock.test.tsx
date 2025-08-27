import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SessionBlock from '../SessionBlock';

// Mock data
const mockSession = {
  id: '1',
  enrollmentId: 'enrollment-1',
  weekday: 0, // 월요일
  startsAt: '09:00',
  endsAt: '10:30',
  room: 'A101',
};

const mockSubject = {
  id: 'math-101',
  name: '수학',
  color: '#ff6b6b',
  credits: 3,
};

describe('SessionBlock', () => {
  const defaultProps = {
    session: mockSession,
    subject: mockSubject,
    left: 100,
    width: 200,
    yOffset: 50,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본적으로 렌더링된다', () => {
    render(<SessionBlock {...defaultProps} />);
    expect(screen.getByText('수학 09:00-10:30')).toBeInTheDocument();
  });

  it('session 정보를 올바르게 표시한다', () => {
    const customSession = {
      ...mockSession,
      startsAt: '14:00',
      endsAt: '15:30',
    };

    render(<SessionBlock {...defaultProps} session={customSession} />);
    expect(screen.getByText('수학 14:00-15:30')).toBeInTheDocument();
  });

  it('subject 정보를 올바르게 표시한다', () => {
    const customSubject = {
      ...mockSubject,
      name: '물리학',
    };

    render(<SessionBlock {...defaultProps} subject={customSubject} />);
    expect(screen.getByText('물리학 09:00-10:30')).toBeInTheDocument();
  });

  it('left 속성을 올바르게 적용한다', () => {
    render(<SessionBlock {...defaultProps} left={200} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ left: '200px' });
  });

  it('width 속성을 올바르게 적용한다', () => {
    render(<SessionBlock {...defaultProps} width={300} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ width: '300px' });
  });

  it('yOffset 속성을 올바르게 적용한다', () => {
    render(<SessionBlock {...defaultProps} yOffset={100} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ top: '106px' }); // 6 + yOffset
  });

  it('onClick 함수를 올바르게 호출한다', () => {
    const mockOnClick = vi.fn();
    render(<SessionBlock {...defaultProps} onClick={mockOnClick} />);

    const block = screen.getByText('수학 09:00-10:30').closest('div');
    fireEvent.click(block!);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<SessionBlock {...defaultProps} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');

    expect(block).toHaveStyle({
      position: 'absolute',
      height: '28px',
      borderRadius: '4px',
      padding: '0px 6px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      cursor: 'pointer',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    });
  });

  it('subject color를 올바르게 적용한다', () => {
    render(<SessionBlock {...defaultProps} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ background: '#ff6b6b' });
  });

  it('subject color가 없을 때 기본 색상을 사용한다', () => {
    const subjectWithoutColor = { ...mockSubject, color: undefined };
    render(<SessionBlock {...defaultProps} subject={subjectWithoutColor} />);

    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ background: '#888' });
  });

  it('zIndex가 yOffset + 1로 설정된다', () => {
    render(<SessionBlock {...defaultProps} yOffset={75} />);
    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({ zIndex: 76 }); // 75 + 1
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={150}
        width={250}
        yOffset={80}
        onClick={vi.fn()}
      />
    );

    const block = screen.getByText('수학 09:00-10:30').closest('div');
    expect(block).toHaveStyle({
      left: '150px',
      width: '250px',
      top: '86px', // 6 + 80
      zIndex: 81, // 80 + 1
    });
  });

  it('subject가 null일 때도 렌더링된다', () => {
    render(
      <SessionBlock
        {...defaultProps}
        subject={null as unknown as { id: string; name: string; color: string }}
      />
    );
    expect(screen.getByText('09:00-10:30')).toBeInTheDocument();
  });

  it('subject가 null일 때 기본 색상을 사용한다', () => {
    render(
      <SessionBlock
        {...defaultProps}
        subject={null as unknown as { id: string; name: string; color: string }}
      />
    );
    const block = screen.getByText('09:00-10:30').closest('div');
    expect(block).toHaveStyle({ background: '#888' });
  });

  it('텍스트가 너무 길 때 overflow hidden이 적용된다', () => {
    const longSubjectName = '매우 긴 과목 이름입니다';
    const longSubject = { ...mockSubject, name: longSubjectName };

    render(<SessionBlock {...defaultProps} subject={longSubject} />);
    const block = screen
      .getByText(`${longSubjectName} 09:00-10:30`)
      .closest('div');
    expect(block).toHaveStyle({ overflow: 'hidden' });
  });
});
