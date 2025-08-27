import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SessionModal from '../SessionModal';

// Mock data
const mockSubjects = [
  { id: 'math', name: '수학' },
  { id: 'science', name: '과학' },
  { id: 'english', name: '영어' },
];

const mockWeekdays = ['월요일', '화요일', '수요일', '목요일', '금요일'];

const defaultProps = {
  isOpen: true,
  isEdit: false,
  title: '세션 추가',
  data: {
    studentId: '1',
    weekday: 0,
    startTime: '09:00',
    endTime: '10:30',
  },
  subjects: mockSubjects,
  weekdays: mockWeekdays,
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  onDelete: vi.fn(),
};

describe('SessionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen이 false일 때 렌더링되지 않는다', () => {
    render(<SessionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('세션 추가')).not.toBeInTheDocument();
  });

  it('isOpen이 true일 때 렌더링된다', () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText('세션 추가')).toBeInTheDocument();
  });

  it('제목을 올바르게 표시한다', () => {
    render(<SessionModal {...defaultProps} title="세션 수정" />);
    expect(screen.getByText('세션 수정')).toBeInTheDocument();
  });

  it('과목 선택 옵션을 올바르게 표시한다', () => {
    render(<SessionModal {...defaultProps} />);

    const subjectSelect = document.getElementById('modal-subject');
    expect(subjectSelect).toBeInTheDocument();

    expect(screen.getByText('수학')).toBeInTheDocument();
    expect(screen.getByText('과학')).toBeInTheDocument();
    expect(screen.getByText('영어')).toBeInTheDocument();
  });

  it('요일 선택 옵션을 올바르게 표시한다', () => {
    render(<SessionModal {...defaultProps} />);

    const weekdaySelect = document.getElementById('modal-weekday');
    expect(weekdaySelect).toBeInTheDocument();

    expect(screen.getByText('월요일')).toBeInTheDocument();
    expect(screen.getByText('화요일')).toBeInTheDocument();
    expect(screen.getByText('수요일')).toBeInTheDocument();
  });

  it('시작 시간 입력 필드를 올바르게 표시한다', () => {
    render(<SessionModal {...defaultProps} />);

    const startTimeInput = screen.getByDisplayValue('09:00');
    expect(startTimeInput).toBeInTheDocument();
    expect(startTimeInput).toHaveAttribute('type', 'time');
    expect(startTimeInput).toHaveValue('09:00');
  });

  it('종료 시간 입력 필드를 올바르게 표시한다', () => {
    render(<SessionModal {...defaultProps} />);

    const endTimeInput = screen.getByDisplayValue('10:30');
    expect(endTimeInput).toBeInTheDocument();
    expect(endTimeInput).toHaveAttribute('type', 'time');
    expect(endTimeInput).toHaveValue('10:30');
  });

  it('요일 기본값이 올바르게 설정된다', () => {
    render(
      <SessionModal
        {...defaultProps}
        data={{ ...defaultProps.data, weekday: 2 }}
      />
    );

    const weekdaySelect = document.getElementById(
      'modal-weekday'
    ) as HTMLSelectElement;
    expect(weekdaySelect).toHaveValue('2');
  });

  it('새로 추가 모드일 때 버튼 텍스트가 올바르다', () => {
    render(<SessionModal {...defaultProps} isEdit={false} />);

    expect(screen.getByText('추가')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('수정 모드일 때 버튼 텍스트가 올바르다', () => {
    render(<SessionModal {...defaultProps} isEdit={true} />);

    expect(screen.getByText('저장')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('수정 모드일 때 삭제 버튼이 표시된다', () => {
    render(<SessionModal {...defaultProps} isEdit={true} />);
    expect(screen.getByText('삭제')).toBeInTheDocument();
  });

  it('새로 추가 모드일 때 삭제 버튼이 표시되지 않는다', () => {
    render(<SessionModal {...defaultProps} isEdit={false} />);
    expect(screen.queryByText('삭제')).not.toBeInTheDocument();
  });

  it('onDelete가 없을 때 삭제 버튼이 표시되지 않는다', () => {
    render(
      <SessionModal {...defaultProps} isEdit={true} onDelete={undefined} />
    );
    expect(screen.queryByText('삭제')).not.toBeInTheDocument();
  });

  it('추가 버튼 클릭 시 onSubmit이 호출된다', () => {
    const mockOnSubmit = vi.fn();
    render(<SessionModal {...defaultProps} onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByText('추가'));
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('저장 버튼 클릭 시 onSubmit이 호출된다', () => {
    const mockOnSubmit = vi.fn();
    render(
      <SessionModal {...defaultProps} isEdit={true} onSubmit={mockOnSubmit} />
    );

    fireEvent.click(screen.getByText('저장'));
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const mockOnCancel = vi.fn();
    render(<SessionModal {...defaultProps} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByText('취소'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('삭제 버튼 클릭 시 onDelete가 호출된다', () => {
    const mockOnDelete = vi.fn();
    render(
      <SessionModal {...defaultProps} isEdit={true} onDelete={mockOnDelete} />
    );

    fireEvent.click(screen.getByText('삭제'));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('기본 스타일이 올바르게 적용된다', () => {
    render(<SessionModal {...defaultProps} />);

    const modal = screen.getByText('세션 추가').closest('div');
    expect(modal).toHaveStyle({
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '8px',
      padding: '16px',
      zIndex: 1000,
      minWidth: '320px',
    });
  });

  it('제목 스타일이 올바르게 적용된다', () => {
    render(<SessionModal {...defaultProps} />);

    const title = screen.getByText('세션 추가');
    expect(title).toHaveStyle({
      margin: '0px 0px 12px 0px',
      color: '#fff',
    });
  });

  it('라벨 스타일이 올바르게 적용된다', () => {
    render(<SessionModal {...defaultProps} />);

    const label = screen.getByText('과목');
    expect(label).toHaveStyle({
      display: 'block',
      color: '#ccc',
      fontSize: '12px',
      marginBottom: '4px',
    });
  });

  it('입력 필드 스타일이 올바르게 적용된다', () => {
    render(<SessionModal {...defaultProps} />);

    const input = screen.getByDisplayValue('09:00');
    expect(input).toHaveStyle({
      width: '100%',
      padding: '6px',
      borderRadius: '4px',
      background: '#333',
      color: '#fff',
      border: '1px solid #555',
    });
  });

  it('select 필드 스타일이 올바르게 적용된다', () => {
    render(<SessionModal {...defaultProps} />);

    const select = document.getElementById('modal-subject');
    expect(select).toHaveStyle({
      width: '100%',
      padding: '6px',
      borderRadius: '4px',
      background: '#333',
      color: '#fff',
      border: '1px solid #555',
    });
  });

  it('isEdit에 따라 다른 id를 가진다', () => {
    const { rerender } = render(
      <SessionModal {...defaultProps} isEdit={false} />
    );

    expect(document.getElementById('modal-subject')).toBeInTheDocument();
    expect(document.getElementById('modal-weekday')).toBeInTheDocument();
    expect(document.getElementById('modal-start-time')).toBeInTheDocument();
    expect(document.getElementById('modal-end-time')).toBeInTheDocument();

    rerender(<SessionModal {...defaultProps} isEdit={true} />);

    expect(document.getElementById('edit-modal-subject')).toBeInTheDocument();
    expect(document.getElementById('edit-modal-weekday')).toBeInTheDocument();
    expect(
      document.getElementById('edit-modal-start-time')
    ).toBeInTheDocument();
    expect(document.getElementById('edit-modal-end-time')).toBeInTheDocument();
  });

  it('여러 속성을 동시에 적용할 수 있다', () => {
    render(
      <SessionModal
        isOpen={true}
        isEdit={true}
        title="복합 모달"
        data={{
          studentId: '2',
          weekday: 3,
          startTime: '14:00',
          endTime: '15:30',
        }}
        subjects={[{ id: 'art', name: '미술' }]}
        weekdays={['토요일']}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('복합 모달')).toBeInTheDocument();
    expect(screen.getByText('미술')).toBeInTheDocument();
    expect(screen.getByText('토요일')).toBeInTheDocument();
    expect(screen.getByText('저장')).toBeInTheDocument();
    expect(screen.getByText('삭제')).toBeInTheDocument();
  });
});
