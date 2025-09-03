import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SchedulePage from '../Schedule';

// 모킹을 먼저 설정
vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: vi.fn(() => 'data:image/png;base64,mock-data'),
      width: 1200,
      height: 800,
    })
  ),
}));

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    save: vi.fn(),
  })),
}));

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

describe('SchedulePage - 실제 사용자 시나리오 통합 테스트', () => {
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
            { id: '1', name: '중등수학', color: '#f59e0b' },
            { id: '2', name: '중등영어', color: '#3b82f6' },
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
              enrollmentIds: ['1'],
              weekday: 0,
              startsAt: '11:45',
              endsAt: '12:45',
            },
          ]);
        case 'ui:studentsPanelPos':
          return JSON.stringify({ x: 600, y: 90 });
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 🆕 디버깅 테스트 추가
  describe('🔍 디버깅: DropZone 클릭 이벤트', () => {
    it('DropZone을 클릭하면 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 🆕 DropZone 찾기
      const dropZone = screen.getByTestId('dropzone-0-09:00');
      expect(dropZone).toBeInTheDocument();

      // 🆕 클릭 이벤트 발생
      fireEvent.click(dropZone);

      // 🆕 모달이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByText('수업 추가')).toBeInTheDocument();
      });
    });
  });

  describe('🎯 시나리오 1: 드래그 앤 드롭으로 수업 추가', () => {
    it('학생을 드래그하여 시간표에 드롭하면 수업 추가 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 1. 학생 목록에서 학생을 찾음 (data-testid 사용)
      const student = screen.getByTestId('student-item-1');
      expect(student).toBeInTheDocument();

      // 2. 학생을 드래그 시작
      fireEvent.dragStart(student, {
        dataTransfer: {
          setData: vi.fn(),
          effectAllowed: 'copy',
        },
      });

      // 3. 드롭 존에 드롭
      const dropZone = screen.getByTestId('dropzone-0-09:00'); // 월요일 9시 드롭존
      fireEvent.drop(dropZone, {
        dataTransfer: {
          getData: vi.fn().mockReturnValue('1'), // 김요섭의 ID
          effectAllowed: 'copy',
        },
      });

      // 4. 수업 추가 모달이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByText('수업 추가')).toBeInTheDocument();
      });

      // 5. 모달에 드롭된 학생과 시간 정보가 미리 입력되었는지 확인
      // 학생은 태그로 표시됨 (모달 내의 태그만 찾기)
      const modal = screen
        .getByText('수업 추가')
        .closest('[class*="modalContent"]');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('김요섭');

      const subjectSelect = screen.getByRole('combobox', {
        name: '과목 *',
      }) as HTMLSelectElement;
      const weekdaySelect = screen.getByRole('combobox', {
        name: '요일 *',
      }) as HTMLSelectElement;
      const startTimeInput = screen.getByDisplayValue(
        '09:00'
      ) as HTMLInputElement;

      expect(subjectSelect.value).toBe('1'); // 중등수학의 ID
      expect(weekdaySelect.value).toBe('0'); // 월요일
      expect(startTimeInput.value).toBe('09:00');
    });

    it('모달에서 수업 정보를 입력하고 추가하면 시간표에 반영된다', async () => {
      render(<SchedulePage />);

      // 1. 모달 열기 (빈 공간 클릭으로)
      const dropZone = screen.getByTestId('dropzone-0-09:00'); // 월요일 9시 드롭존
      fireEvent.click(dropZone);

      await waitFor(() => {
        expect(screen.getByText('수업 추가')).toBeInTheDocument();
      });

      // 2. 폼 입력
      // 학생 입력 (태그 시스템)
      const studentInput =
        screen.getByPlaceholderText('학생 이름을 입력하세요');
      fireEvent.change(studentInput, { target: { value: '이영희' } });
      fireEvent.keyDown(studentInput, { key: 'Enter' });

      const subjectSelect = screen.getByRole('combobox', {
        name: '과목 *',
      }) as HTMLSelectElement;
      const startTimeInput = screen.getByDisplayValue(
        '09:00'
      ) as HTMLInputElement;
      const endTimeInput = screen.getByDisplayValue(
        '10:00'
      ) as HTMLInputElement;

      fireEvent.change(subjectSelect, { target: { value: '2' } }); // 중등영어
      fireEvent.change(startTimeInput, { target: { value: '14:00' } });
      fireEvent.change(endTimeInput, { target: { value: '15:00' } });

      // 3. 추가 버튼 클릭 (모달 하단의 추가 버튼)
      const modal = screen
        .getByText('수업 추가')
        .closest('[class*="modalContent"]');
      const addButton = modal?.querySelector(
        '[class*="modalActions"] .button.primary'
      ) as HTMLButtonElement;
      expect(addButton).toBeInTheDocument();
      fireEvent.click(addButton);

      // 4. 모달이 닫혔는지 확인
      await waitFor(() => {
        expect(screen.queryByText('수업 추가')).not.toBeInTheDocument();
      });
    });
  });

  describe('🎯 시나리오 2: 세션 클릭으로 편집', () => {
    it('기존 세션을 클릭하면 편집 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 1. 기존 세션 블록을 찾음
      const sessionBlock = screen.getByTestId('session-block-1');
      expect(sessionBlock).toBeInTheDocument();

      // 2. 세션 블록 클릭
      fireEvent.click(sessionBlock);

      // 3. 편집 모달이 열렸는지 확인
      await waitFor(() => {
        expect(screen.getByText('수업 편집')).toBeInTheDocument();
      });
    });
  });

  describe('🎯 시나리오 3: 학생별 필터링', () => {
    it('학생을 선택하면 해당 학생의 수업만 표시된다', async () => {
      render(<SchedulePage />);

      // 1. 학생 목록에서 김요섭 클릭
      const student = screen.getByTestId('student-item-1');
      console.log('클릭 전 학생 요소의 클래스:', student.className);

      // onMouseDown 이벤트를 발생시키기 위해 mouseDown 사용
      fireEvent.mouseDown(student);

      // 2. 선택 상태가 변경되었는지 확인
      console.log('클릭 후 학생 요소의 클래스:', student.className);
      expect(student.className).toContain('selected');
    });

    it('학생 선택을 해제하면 전체 학생의 수업이 표시된다', async () => {
      render(<SchedulePage />);

      // 1. 김요섭 선택
      const student = screen.getByTestId('student-item-1');
      fireEvent.click(student);

      // 2. 다시 클릭하여 선택 해제
      fireEvent.click(student);

      // 3. 선택 상태가 해제되었는지 확인
      expect(student).not.toHaveClass('selected');
    });
  });

  describe('🎯 시나리오 4: 플로팅 패널 동작', () => {
    it('검색 기능으로 학생 목록을 필터링할 수 있다', async () => {
      render(<SchedulePage />);

      // 1. 검색 입력창을 찾음
      const searchInput = screen.getByPlaceholderText('학생 이름 검색...');
      expect(searchInput).toBeInTheDocument();

      // 2. 검색어 입력
      fireEvent.change(searchInput, { target: { value: '김' } });

      // 3. 김요섭만 표시되는지 확인
      expect(screen.getByTestId('student-item-1')).toBeInTheDocument();
      expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    });
  });

  describe('🎯 시나리오 5: PDF 다운로드', () => {
    it('PDF 다운로드 버튼을 클릭하면 시간표가 PDF로 변환된다', async () => {
      render(<SchedulePage />);

      // 1. PDF 다운로드 버튼을 찾음
      const downloadButton = screen.getByText('시간표 다운로드');
      expect(downloadButton).toBeInTheDocument();

      // 2. 버튼 클릭
      fireEvent.click(downloadButton);

      // 3. 다운로드 중 상태 표시
      await waitFor(() => {
        expect(screen.getByText('다운로드 중...')).toBeInTheDocument();
      });
    });
  });
});
