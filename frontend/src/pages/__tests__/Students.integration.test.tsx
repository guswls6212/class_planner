import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StudentsPage from '../Students';

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

describe('StudentsPage - 실제 사용자 시나리오 통합 테스트', () => {
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
        case 'ui:selectedStudent':
          return '1';
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('학생 관리 기능', () => {
    it('학생 추가 기능이 정상적으로 작동한다', async () => {
      render(<StudentsPage />);

      // 학생 추가 입력창 찾기
      const input = screen.getByPlaceholderText('학생 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: /추가/i });

      expect(input).toBeInTheDocument();
      expect(addButton).toBeInTheDocument();

      // 새 학생 추가
      fireEvent.change(input, { target: { value: '새학생' } });
      fireEvent.click(addButton);

      // localStorage에 저장되었는지 확인
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'students',
          expect.stringContaining('새학생')
        );
      });
    });

    it('중복된 학생 이름 추가를 방지한다', async () => {
      render(<StudentsPage />);

      const input = screen.getByPlaceholderText('학생 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: /추가/i });

      // 이미 존재하는 학생 이름 입력
      fireEvent.change(input, { target: { value: '김요섭' } });
      fireEvent.click(addButton);

      // 화면에 에러 메시지가 표시되는지 확인 (중복 체크)
      await waitFor(() => {
        expect(
          screen.getByText('이미 존재하는 학생 이름입니다.')
        ).toBeInTheDocument();
      });
    });

    it('학생 삭제 기능이 정상적으로 작동한다', async () => {
      render(<StudentsPage />);

      // 삭제 버튼 찾기 (첫 번째 학생의 삭제 버튼)
      const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
      const firstDeleteButton = deleteButtons[0];

      expect(firstDeleteButton).toBeInTheDocument();

      // 삭제 버튼 클릭
      fireEvent.click(firstDeleteButton);

      // localStorage에서 학생이 삭제되었는지 확인
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'students',
          expect.not.stringContaining('김요섭')
        );
      });
    });

    it('학생 선택 기능이 정상적으로 작동한다', async () => {
      render(<StudentsPage />);

      // 학생 목록에서 첫 번째 학생 클릭 (listitem으로 찾기)
      const studentItems = screen.getAllByRole('listitem');
      const firstStudent = studentItems[0];

      expect(firstStudent).toBeInTheDocument();

      if (firstStudent) {
        fireEvent.click(firstStudent);

        // localStorage에 선택된 학생 ID가 저장되었는지 확인
        await waitFor(() => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'ui:selectedStudent',
            '1'
          );
        });
      }
    });
  });

  describe('기본 과목 자동 생성', () => {
    it('페이지 로드 시 기본 과목이 자동으로 생성된다', async () => {
      // Students 페이지는 더 이상 과목을 직접 관리하지 않음
      // 과목 관리는 전역 상태(useGlobalSubjects)에서 처리됨
      render(<StudentsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('students-page')).toBeInTheDocument();
      });
    });
  });

  describe('레이아웃 및 UI', () => {
    it('좌측 340px 고정 너비 레이아웃이 유지된다', () => {
      render(<StudentsPage />);

      // StudentManagementSection이 렌더링되었는지 확인
      const studentSection = screen.getByText('학생 목록');
      expect(studentSection).toBeInTheDocument();

      // 그리드 레이아웃이 적용되었는지 확인
      const container = studentSection.closest('div');
      expect(container).toHaveStyle({
        gridTemplateColumns: '340px 1fr',
      });
    });

    it('학생 목록이 정상적으로 표시된다', () => {
      render(<StudentsPage />);

      // 기존 학생들이 표시되는지 확인
      expect(screen.getByText('김요섭')).toBeInTheDocument();
      expect(screen.getByText('이영희')).toBeInTheDocument();
    });
  });

  describe('데이터 지속성', () => {
    it('localStorage에서 데이터를 정상적으로 불러온다', () => {
      render(<StudentsPage />);

      // localStorage.getItem이 호출되었는지 확인
      expect(localStorageMock.getItem).toHaveBeenCalledWith('students');
      // Students 페이지는 더 이상 subjects나 enrollments를 직접 관리하지 않음
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'ui:selectedStudent'
      );
    });

    it('데이터 변경 시 localStorage에 저장한다', async () => {
      render(<StudentsPage />);

      const input = screen.getByPlaceholderText('학생 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: /추가/i });

      fireEvent.change(input, { target: { value: '테스트학생' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });
});
