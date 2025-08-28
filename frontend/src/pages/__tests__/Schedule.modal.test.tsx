import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SchedulePage from '../Schedule';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// Mock confirm
global.confirm = vi.fn(() => true);

// Mock alert
global.alert = vi.fn();

describe('SchedulePage - 세션 편집 모달 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 데이터 설정
    mockLocalStorage.getItem.mockImplementation(key => {
      if (key === 'students') {
        return JSON.stringify([
          { id: '1', name: '김요섭' },
          { id: '2', name: '강지원' },
        ]);
      }
      if (key === 'subjects') {
        return JSON.stringify([
          { id: '1', name: '수학', color: '#f59e0b' },
          { id: '2', name: '영어', color: '#3b82f6' },
        ]);
      }
      if (key === 'enrollments') {
        return JSON.stringify([{ id: '1', studentId: '1', subjectId: '1' }]);
      }
      if (key === 'sessions') {
        return JSON.stringify([
          {
            id: '1',
            enrollmentId: '1',
            weekday: 0,
            startsAt: '11:45',
            endsAt: '12:45',
          },
        ]);
      }
      return null;
    });
  });

  describe('세션 편집 모달 렌더링', () => {
    it('세션 편집 모달이 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 처음에는 보이지 않아야 함
      expect(screen.queryByText('수업 편집')).not.toBeInTheDocument();
    });

    it('세션을 클릭하면 편집 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 세션 블록을 찾아서 클릭
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      expect(sessionBlock).toBeInTheDocument();

      fireEvent.click(sessionBlock);

      // 모달이 열려야 함
      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });
  });

  describe('모달 내부 요소들', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 세션을 클릭하여 모달 열기
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      fireEvent.click(sessionBlock);

      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });

    it('모달 제목이 올바르게 표시된다', () => {
      expect(screen.getByText('수업 편집')).toBeInTheDocument();
    });

    it('학생 정보가 올바르게 표시된다', () => {
      expect(screen.getByText('학생')).toBeInTheDocument();
      // 모달 내부의 학생 정보만 확인 (플로팅 패널의 학생 정보와 구분)
      const modal = screen.getByText('수업 편집').closest('.modal-overlay');
      const studentInfo = modal?.querySelector('.form-input');
      expect(studentInfo).toHaveTextContent('김요섭');
    });

    it('과목 정보가 올바르게 표시된다', () => {
      expect(screen.getByText('과목')).toBeInTheDocument();
      // 모달 내부의 과목 정보만 확인
      const modal = screen.getByText('수업 편집').closest('.modal-overlay');
      const subjectInfo = modal?.querySelectorAll('.form-input')[1];
      expect(subjectInfo).toHaveTextContent('수학');
    });

    it('요일 선택 드롭다운이 올바르게 표시된다', () => {
      expect(screen.getByText('요일')).toBeInTheDocument();
      expect(screen.getByDisplayValue('월')).toBeInTheDocument();
    });

    it('시작 시간 입력 필드가 올바르게 표시된다', () => {
      expect(screen.getByText('시작 시간')).toBeInTheDocument();
      expect(screen.getByDisplayValue('11:45')).toBeInTheDocument();
    });

    it('종료 시간 입력 필드가 올바르게 표시된다', () => {
      expect(screen.getByText('종료 시간')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12:45')).toBeInTheDocument();
    });
  });

  describe('모달 버튼 색상 및 스타일', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 세션을 클릭하여 모달 열기
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      fireEvent.click(sessionBlock);

      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });

    it('삭제 버튼이 올바르게 렌더링된다', () => {
      const deleteButton = screen.getByText('삭제');
      expect(deleteButton).toBeInTheDocument();

      // Button 컴포넌트가 올바르게 렌더링되었는지 확인
      expect(deleteButton.tagName).toBe('BUTTON');
    });

    it('취소 버튼이 올바르게 렌더링된다', () => {
      const cancelButton = screen.getByText('취소');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.tagName).toBe('BUTTON');
    });

    it('저장 버튼이 올바르게 렌더링된다', () => {
      const saveButton = screen.getByText('저장');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton.tagName).toBe('BUTTON');
    });

    it('모든 버튼이 올바른 순서로 배치된다', () => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      expect(buttons[0]).toHaveTextContent('삭제');
      expect(buttons[1]).toHaveTextContent('취소');
      expect(buttons[2]).toHaveTextContent('저장');
    });
  });

  describe('요일 드롭다운 화살표 위치', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 세션을 클릭하여 모달 열기
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      fireEvent.click(sessionBlock);

      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });

    it('요일 드롭다운이 커스텀 화살표를 사용한다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');
      expect(weekdaySelect).toBeInTheDocument();

      // CSS 클래스 확인
      expect(weekdaySelect).toHaveClass('form-select');
    });

    it('요일 드롭다운에 올바른 옵션들이 포함된다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');

      // 요일 옵션들 확인
      expect(weekdaySelect).toHaveValue('0'); // 월요일

      // select 요소의 옵션들 확인
      const options = weekdaySelect.querySelectorAll('option');
      expect(options).toHaveLength(7); // 월~일
      expect(options[0]).toHaveTextContent('월');
      expect(options[6]).toHaveTextContent('일');
    });
  });

  describe('모달 CSS 클래스 및 스타일', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 세션을 클릭하여 모달 열기
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      fireEvent.click(sessionBlock);

      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });

    it('모달이 올바른 CSS 클래스를 가진다', () => {
      const modal = screen.getByText('수업 편집').closest('.modal-overlay');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass('modal-overlay');
    });

    it('모달 헤더가 올바른 CSS 클래스를 가진다', () => {
      const header = screen.getByText('수업 편집');
      expect(header).toHaveClass('modal-header');
    });

    it('모달 폼이 올바른 CSS 클래스를 가진다', () => {
      const form = screen.getByText('학생').closest('.modal-form');
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass('modal-form');
    });

    it('모달 액션 버튼들이 올바른 CSS 클래스를 가진다', () => {
      const actions = screen.getByText('삭제').closest('.modal-actions');
      expect(actions).toBeInTheDocument();
      expect(actions).toHaveClass('modal-actions');
    });

    it('폼 그룹들이 올바른 CSS 클래스를 가진다', () => {
      const formGroups = document.querySelectorAll('.form-group');
      expect(formGroups).toHaveLength(5); // 학생, 과목, 요일, 시작시간, 종료시간
    });

    it('폼 라벨들이 올바른 CSS 클래스를 가진다', () => {
      const labels = document.querySelectorAll('.form-label');
      expect(labels).toHaveLength(5);
      labels.forEach(label => {
        expect(label).toHaveClass('form-label');
      });
    });

    it('폼 입력 필드들이 올바른 CSS 클래스를 가진다', () => {
      const inputs = document.querySelectorAll('.form-input');
      // 학생, 과목, 시작시간, 종료시간 (학생과 과목은 div, 시작시간과 종료시간은 input)
      expect(inputs.length).toBeGreaterThanOrEqual(3);

      const selects = document.querySelectorAll('.form-select');
      expect(selects).toHaveLength(1); // 요일
    });
  });

  describe('모달 상호작용', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 세션을 클릭하여 모달 열기
      const sessionBlock = screen.getByText('수학 11:45-12:45');
      fireEvent.click(sessionBlock);

      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });

    it('취소 버튼을 클릭하면 모달이 닫힌다', async () => {
      const cancelButton = screen.getByText('취소');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('수업 편집')).not.toBeInTheDocument();
      });
    });

    it('요일을 변경할 수 있다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');
      fireEvent.change(weekdaySelect, { target: { value: '2' } }); // 수요일

      expect(weekdaySelect).toHaveValue('2');
    });

    it('시작 시간을 변경할 수 있다', () => {
      const startTimeInput = screen.getByDisplayValue('11:45');
      fireEvent.change(startTimeInput, { target: { value: '12:00' } });

      expect(startTimeInput).toHaveValue('12:00');
    });

    it('종료 시간을 변경할 수 있다', () => {
      const endTimeInput = screen.getByDisplayValue('12:45');
      fireEvent.change(endTimeInput, { target: { value: '13:00' } });

      expect(endTimeInput).toHaveValue('13:00');
    });
  });
});
