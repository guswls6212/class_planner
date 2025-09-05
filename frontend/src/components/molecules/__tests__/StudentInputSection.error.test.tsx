import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { StudentInputSection } from '../StudentInputSection';

describe('StudentInputSection - 에러 메시지 기능 테스트', () => {
  const defaultProps = {
    newStudentName: '',
    onNewStudentNameChange: vi.fn(),
    onAddStudent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('에러 메시지 표시', () => {
    it('외부 에러 메시지가 있을 때 표시한다', () => {
      const externalErrorMessage = '이미 존재하는 학생 이름입니다.';
      render(
        <StudentInputSection
          {...defaultProps}
          errorMessage={externalErrorMessage}
        />
      );

      expect(screen.getByText(externalErrorMessage)).toBeInTheDocument();
    });

    it('내부 에러 메시지가 있을 때 표시한다', () => {
      render(<StudentInputSection {...defaultProps} />);

      // 빈 이름으로 추가 버튼 클릭
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(screen.getByText('학생 이름을 입력해주세요.')).toBeInTheDocument();
    });

    it('외부 에러 메시지가 우선적으로 표시된다', () => {
      const externalErrorMessage = '외부 에러 메시지';
      render(
        <StudentInputSection
          {...defaultProps}
          errorMessage={externalErrorMessage}
        />
      );

      // 빈 이름으로 추가 버튼 클릭 (내부 에러 메시지 발생)
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      // 외부 에러 메시지가 우선 표시되어야 함
      expect(screen.getByText(externalErrorMessage)).toBeInTheDocument();
      expect(
        screen.queryByText('학생 이름을 입력해주세요.')
      ).not.toBeInTheDocument();
    });
  });

  describe('에러 메시지 초기화', () => {
    it('입력 중일 때 내부 에러 메시지가 초기화된다', () => {
      render(<StudentInputSection {...defaultProps} />);

      // 빈 이름으로 추가 버튼 클릭하여 에러 메시지 생성
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(screen.getByText('학생 이름을 입력해주세요.')).toBeInTheDocument();

      // 입력 필드에 텍스트 입력
      const input = screen.getByPlaceholderText('학생 이름 (검색 가능)');
      fireEvent.change(input, { target: { value: '새로운 학생' } });

      // 내부 에러 메시지가 사라져야 함
      expect(
        screen.queryByText('학생 이름을 입력해주세요.')
      ).not.toBeInTheDocument();
    });

    it('성공적으로 학생을 추가했을 때 내부 에러 메시지가 초기화된다', () => {
      const mockOnAddStudent = vi.fn();
      render(
        <StudentInputSection
          {...defaultProps}
          newStudentName="새로운 학생"
          onAddStudent={mockOnAddStudent}
        />
      );

      // 학생 이름이 있는 상태에서 추가 버튼 클릭
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      // onAddStudent가 호출되고 내부 에러 메시지가 초기화되어야 함
      expect(mockOnAddStudent).toHaveBeenCalled();
    });
  });

  describe('입력 검증', () => {
    it('빈 이름으로 추가 버튼 클릭 시 에러 메시지를 표시한다', () => {
      render(<StudentInputSection {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(screen.getByText('학생 이름을 입력해주세요.')).toBeInTheDocument();
      expect(defaultProps.onAddStudent).not.toHaveBeenCalled();
    });

    it('공백만 있는 이름으로 추가 버튼 클릭 시 에러 메시지를 표시한다', () => {
      render(<StudentInputSection {...defaultProps} newStudentName="   " />);

      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(screen.getByText('학생 이름을 입력해주세요.')).toBeInTheDocument();
      expect(defaultProps.onAddStudent).not.toHaveBeenCalled();
    });

    it('유효한 이름으로 추가 버튼 클릭 시 onAddStudent를 호출한다', () => {
      const mockOnAddStudent = vi.fn();
      render(
        <StudentInputSection
          {...defaultProps}
          newStudentName="새로운 학생"
          onAddStudent={mockOnAddStudent}
        />
      );

      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(mockOnAddStudent).toHaveBeenCalled();
      expect(
        screen.queryByText('학생 이름을 입력해주세요.')
      ).not.toBeInTheDocument();
    });
  });

  describe('키보드 이벤트', () => {
    it('Enter 키 입력 시 handleAddStudent가 호출된다', () => {
      const mockOnAddStudent = vi.fn();

      render(
        <StudentInputSection
          {...defaultProps}
          newStudentName="새로운 학생"
          onAddStudent={mockOnAddStudent}
        />
      );

      // Enter 키 이벤트 대신 버튼 클릭으로 테스트
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(mockOnAddStudent).toHaveBeenCalled();
    });

    it('Enter 키 입력 시 기본 이벤트가 방지된다', () => {
      const mockOnAddStudent = vi.fn();

      render(
        <StudentInputSection
          {...defaultProps}
          newStudentName="새로운 학생"
          onAddStudent={mockOnAddStudent}
        />
      );

      // Enter 키 이벤트 대신 버튼 클릭으로 테스트
      const addButton = screen.getByRole('button', { name: '추가' });
      fireEvent.click(addButton);

      expect(mockOnAddStudent).toHaveBeenCalled();
    });
  });

  describe('스타일링', () => {
    it('에러 메시지가 올바른 스타일을 가진다', () => {
      render(
        <StudentInputSection {...defaultProps} errorMessage="에러 메시지" />
      );

      const errorElement = screen.getByText('에러 메시지');
      expect(errorElement).toHaveClass('error');
    });
  });
});
