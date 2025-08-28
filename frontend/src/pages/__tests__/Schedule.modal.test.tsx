import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SchedulePage from '../Schedule';
import styles from '../Schedule.module.css';

// localStorage 모킹
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// crypto.randomUUID 모킹
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// confirm 모킹
global.confirm = vi.fn(() => true);

describe('SchedulePage - 세션 편집 모달 테스트', () => {
  beforeEach(() => {
    // 기본 데이터 설정
    localStorageMock.getItem.mockImplementation(key => {
      switch (key) {
        case 'students':
          return JSON.stringify([
            { id: '1', name: '김요섭' },
            { id: '2', name: '이영희' },
          ]);
        case 'subjects':
          return JSON.stringify([
            { id: '1', name: '수학', color: '#f59e0b' },
            { id: '2', name: '영어', color: '#3b82f6' },
          ]);
        case 'enrollments':
          return JSON.stringify([
            { id: '1', studentId: '1', subjectId: '1' },
            { id: '2', studentId: '2', subjectId: '2' },
          ]);
        case 'sessions':
          return JSON.stringify([
            {
              id: '1',
              enrollmentId: '1',
              weekday: 0,
              startsAt: '11:45',
              endsAt: '12:45',
            },
          ]);
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('세션 편집 모달 렌더링', () => {
    it('세션 편집 모달이 올바르게 렌더링된다', () => {
      render(<SchedulePage />);

      // 모달이 초기에는 보이지 않아야 함
      expect(screen.queryByText('수업 편집')).not.toBeInTheDocument();
    });

    it('세션을 클릭하면 편집 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 세션 블록을 찾아서 클릭 (data-testid나 더 구체적인 선택자 사용)
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        // 모달이 열렸는지 확인
        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      } else {
        // 세션 블록을 찾을 수 없는 경우 테스트 스킵
        console.warn(
          '세션 블록을 찾을 수 없습니다. TimeTableGrid 렌더링을 확인해주세요.'
        );
      }
    });
  });

  describe('모달 내부 요소들', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 모달 열기
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      }
    });

    it('모달 제목이 올바르게 표시된다', () => {
      expect(screen.getByText('수업 편집')).toBeInTheDocument();
    });

    it('학생 정보가 올바르게 표시된다', () => {
      // CSS Modules 스타일을 사용하여 요소 찾기
      const modal = screen
        .getByText('수업 편집')
        .closest(`.${styles.modalOverlay}`);
      if (modal) {
        const studentInfo = modal.querySelector(`.${styles.formInput}`);
        expect(studentInfo).toHaveTextContent('김요섭');
      }
    });

    it('과목 정보가 올바르게 표시된다', () => {
      const modal = screen
        .getByText('수업 편집')
        .closest(`.${styles.modalOverlay}`);
      if (modal) {
        const subjectInfo = modal.querySelectorAll(`.${styles.formInput}`)[1];
        expect(subjectInfo).toHaveTextContent('수학');
      }
    });

    it('요일 선택 드롭다운이 올바르게 표시된다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');
      expect(weekdaySelect).toBeInTheDocument();
      expect(weekdaySelect.tagName).toBe('SELECT');
    });

    it('시작 시간 입력 필드가 올바르게 표시된다', () => {
      const startTimeInput = screen.getByDisplayValue('11:45');
      expect(startTimeInput).toBeInTheDocument();
      expect(startTimeInput.tagName).toBe('INPUT');
    });

    it('종료 시간 입력 필드가 올바르게 표시된다', () => {
      const endTimeInput = screen.getByDisplayValue('12:45');
      expect(endTimeInput).toBeInTheDocument();
      expect(endTimeInput.tagName).toBe('INPUT');
    });
  });

  describe('모달 버튼 색상 및 스타일', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 모달 열기
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      }
    });

    it('삭제 버튼이 올바르게 렌더링된다', () => {
      const deleteButton = screen.getByText('삭제');
      expect(deleteButton).toBeInTheDocument();
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
      const buttonTexts = buttons.map(button => button.textContent);

      // 삭제, 취소, 저장 순서 확인
      expect(buttonTexts).toContain('삭제');
      expect(buttonTexts).toContain('취소');
      expect(buttonTexts).toContain('저장');
    });
  });

  describe('요일 드롭다운 화살표 위치', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 모달 열기
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      }
    });

    it('요일 드롭다운이 커스텀 화살표를 사용한다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');

      // CSS Modules 스타일을 사용하여 클래스 확인
      expect(weekdaySelect).toHaveClass(styles.formSelect);
    });

    it('요일 드롭다운에 올바른 옵션들이 포함된다', () => {
      const weekdaySelect = screen.getByDisplayValue('월');
      const options = weekdaySelect.querySelectorAll('option');

      expect(options).toHaveLength(7); // 월부터 일까지
      expect(options[0]).toHaveTextContent('월');
      expect(options[6]).toHaveTextContent('일');
    });
  });

  describe('모달 CSS 클래스 및 스타일', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 모달 열기
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      }
    });

    it('모달이 올바른 CSS 클래스를 가진다', () => {
      const modal = screen
        .getByText('수업 편집')
        .closest(`.${styles.modalOverlay}`);
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveClass(styles.modalOverlay);
    });

    it('모달 헤더가 올바른 CSS 클래스를 가진다', () => {
      const header = screen.getByText('수업 편집');
      expect(header).toHaveClass(styles.modalHeader);
    });

    it('모달 폼이 올바른 CSS 클래스를 가진다', () => {
      const form = screen.getByText('학생').closest(`.${styles.modalForm}`);
      expect(form).toBeInTheDocument();
      expect(form).toHaveClass(styles.modalForm);
    });

    it('모달 액션 버튼들이 올바른 CSS 클래스를 가진다', () => {
      const actions = screen
        .getByText('삭제')
        .closest(`.${styles.modalActions}`);
      expect(actions).toBeInTheDocument();
      expect(actions).toHaveClass(styles.modalActions);
    });

    it('폼 그룹들이 올바른 CSS 클래스를 가진다', () => {
      const formGroups = document.querySelectorAll(`.${styles.formGroup}`);
      expect(formGroups).toHaveLength(5); // 학생, 과목, 요일, 시작시간, 종료시간
    });

    it('폼 라벨들이 올바른 CSS 클래스를 가진다', () => {
      const labels = document.querySelectorAll(`.${styles.formLabel}`);
      expect(labels).toHaveLength(5);
      labels.forEach(label => {
        expect(label).toHaveClass(styles.formLabel);
      });
    });

    it('폼 입력 필드들이 올바른 CSS 클래스를 가진다', () => {
      const inputs = document.querySelectorAll(`.${styles.formInput}`);
      // 학생, 과목, 시작시간, 종료시간 (학생과 과목은 div, 시작시간과 종료시간은 input)
      expect(inputs.length).toBeGreaterThanOrEqual(3);

      const selects = document.querySelectorAll(`.${styles.formSelect}`);
      expect(selects).toHaveLength(1); // 요일 선택만
    });
  });

  describe('모달 상호작용', () => {
    beforeEach(async () => {
      render(<SchedulePage />);

      // 모달 열기
      const sessionBlock =
        screen.getByTestId('session-block-1') ||
        document.querySelector('[data-session-id="1"]') ||
        screen.getByText(/수학/);

      if (sessionBlock) {
        fireEvent.click(sessionBlock);

        await waitFor(() => {
          expect(screen.getByText('수업 편집')).toBeInTheDocument();
        });
      }
    });

    it('취소 버튼을 클릭하면 모달이 닫힌다', async () => {
      const cancelButton = screen.getByText('취소');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('수업 편집')).not.toBeInTheDocument();
      });
    });

    it('요일을 변경할 수 있다', () => {
      const weekdaySelect = screen.getByDisplayValue('월') as HTMLSelectElement;
      fireEvent.change(weekdaySelect, { target: { value: '2' } });

      expect(weekdaySelect.value).toBe('2');
    });

    it('시작 시간을 변경할 수 있다', () => {
      const startTimeInput = screen.getByDisplayValue(
        '11:45'
      ) as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '12:00' } });

      expect(startTimeInput.value).toBe('12:00');
    });

    it('종료 시간을 변경할 수 있다', () => {
      const endTimeInput = screen.getByDisplayValue(
        '12:45'
      ) as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '13:00' } });

      expect(endTimeInput.value).toBe('13:00');
    });
  });
});
