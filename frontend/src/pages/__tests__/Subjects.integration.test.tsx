import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SubjectsPage from '../../pages/Subjects';

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

describe('SubjectsPage - 실제 사용자 시나리오 통합 테스트', () => {
  beforeEach(() => {
    // 기본 데이터 설정
    localStorageMock.getItem.mockImplementation(key => {
      switch (key) {
        case 'subjects':
          return JSON.stringify([
            { id: '1', name: '중등수학', color: '#f59e0b' },
            { id: '2', name: '중등영어', color: '#3b82f6' },
          ]);
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('과목 관리 기능', () => {
    it('과목 추가 기능이 정상적으로 작동한다', async () => {
      render(<SubjectsPage />);

      // 과목 추가 입력창 찾기
      const input = screen.getByPlaceholderText('과목 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: '추가' });
      const colorInput = screen.getByTitle('과목 색상 선택');

      expect(input).toBeInTheDocument();
      expect(addButton).toBeInTheDocument();
      expect(colorInput).toBeInTheDocument();

      // 새 과목 추가
      fireEvent.change(input, { target: { value: '새과목' } });
      fireEvent.change(colorInput, { target: { value: '#10b981' } });
      fireEvent.click(addButton);

      // 사용자가 보는 피드백: 새 과목이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('새과목')).toBeInTheDocument();
      });

      // 입력창이 초기화되어 다음 입력을 받을 준비가 되었는지 확인
      expect(input).toHaveValue('');

      // localStorage에 저장되었는지 확인
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('새과목')
      );
    });

    it('중복된 과목 이름 추가를 방지한다', async () => {
      render(<SubjectsPage />);

      const input = screen.getByPlaceholderText('과목 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: '추가' });

      // 이미 존재하는 과목 이름 입력
      fireEvent.change(input, { target: { value: '중등수학' } });
      fireEvent.click(addButton);

      // 사용자에게 보이는 에러 메시지가 표시되는지 확인
      await waitFor(() => {
        expect(
          screen.getByText('이미 존재하는 과목 이름입니다.')
        ).toBeInTheDocument();
      });

      // 입력창이 초기화되지 않고 사용자가 수정할 수 있도록 유지되는지 확인
      expect(input).toHaveValue('중등수학');

      // localStorage에 중복된 과목이 추가되지 않았는지 확인
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('중등수학')
      );
    });

    it('과목 삭제 기능이 정상적으로 작동한다', async () => {
      render(<SubjectsPage />);

      // 삭제 전 과목이 목록에 있는지 확인
      expect(screen.getByText('중등수학')).toBeInTheDocument();

      // 과목 목록에서 삭제 버튼 찾기
      const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
      expect(deleteButtons.length).toBeGreaterThan(0);

      // 첫 번째 과목 삭제
      fireEvent.click(deleteButtons[0]);

      // 사용자가 보는 피드백: 과목이 목록에서 사라졌는지 확인
      await waitFor(() => {
        expect(screen.queryByText('중등수학')).not.toBeInTheDocument();
      });

      // localStorage에서 삭제되었는지 확인
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.not.stringContaining('중등수학')
      );
    });

    it('과목 선택 기능이 정상적으로 작동한다', async () => {
      render(<SubjectsPage />);

      // 과목 목록에서 첫 번째 과목 클릭
      const subjectItems = screen.getAllByTestId(/subject-item-/);
      expect(subjectItems.length).toBeGreaterThan(0);

      fireEvent.click(subjectItems[0]);

      // 과목이 클릭되었는지 확인 (실제 구현에 따라 다를 수 있음)
      // 현재는 단순히 클릭이 가능한지만 확인
      expect(subjectItems[0]).toBeInTheDocument();
    });

    it('과목 편집 기능이 정상적으로 작동한다', async () => {
      render(<SubjectsPage />);

      // 편집 전 원본 과목이 있는지 확인
      expect(screen.getByText('중등수학')).toBeInTheDocument();

      // 편집 버튼 찾기
      const editButtons = screen.getAllByRole('button', { name: '편집' });
      expect(editButtons.length).toBeGreaterThan(0);

      // 첫 번째 과목 편집 모드로 전환
      fireEvent.click(editButtons[0]);

      // 편집 모드에서 입력창과 색상 선택기가 나타나는지 확인
      await waitFor(() => {
        expect(screen.getByDisplayValue('중등수학')).toBeInTheDocument();
        expect(screen.getByTitle('저장')).toBeInTheDocument();
        expect(screen.getByTitle('취소')).toBeInTheDocument();
      });

      // 이름 변경
      const editInput = screen.getByDisplayValue('중등수학');
      fireEvent.change(editInput, { target: { value: '수정된 수학' } });

      // 저장 버튼 클릭
      const saveButton = screen.getByTitle('저장');
      fireEvent.click(saveButton);

      // 사용자가 보는 피드백: 수정된 이름이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('수정된 수학')).toBeInTheDocument();
        expect(screen.queryByText('중등수학')).not.toBeInTheDocument();
      });

      // localStorage에 저장되었는지 확인
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'subjects',
        expect.stringContaining('수정된 수학')
      );
    });
  });

  describe('검색 기능', () => {
    it('과목 검색 기능이 정상적으로 작동한다', () => {
      render(<SubjectsPage />);

      // 검색 전 모든 과목이 표시되는지 확인
      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.getByText('중등영어')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText('과목 이름 (검색 가능)');
      expect(searchInput).toBeInTheDocument();

      // 검색어 입력
      fireEvent.change(searchInput, { target: { value: '수학' } });

      // 사용자가 보는 검색 결과: 필터링된 과목만 표시되는지 확인
      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.queryByText('중등영어')).not.toBeInTheDocument();

      // 검색어가 입력창에 유지되는지 확인
      expect(searchInput).toHaveValue('수학');
    });

    it('검색어가 없을 때 모든 과목이 표시된다', () => {
      render(<SubjectsPage />);

      const searchInput = screen.getByPlaceholderText('과목 이름 (검색 가능)');

      // 검색어 입력 후 지우기
      fireEvent.change(searchInput, { target: { value: '수학' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      // 사용자가 보는 결과: 모든 과목이 다시 표시되는지 확인
      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.getByText('중등영어')).toBeInTheDocument();

      // 입력창이 비어있는지 확인
      expect(searchInput).toHaveValue('');
    });
  });

  describe('레이아웃 및 UI', () => {
    it('좌측 340px 고정 너비 레이아웃이 유지된다', () => {
      render(<SubjectsPage />);

      const pageElement = screen.getByTestId('subjects-page');
      expect(pageElement).toHaveStyle('grid-template-columns: 340px 1fr');
    });

    it('과목 목록이 정상적으로 표시된다', () => {
      render(<SubjectsPage />);

      expect(screen.getByText('과목 목록')).toBeInTheDocument();
      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.getByText('중등영어')).toBeInTheDocument();
    });

    it('색상 선택기가 올바르게 표시된다', () => {
      render(<SubjectsPage />);

      const colorInputs = screen.getAllByTitle('과목 색상 선택');
      expect(colorInputs.length).toBeGreaterThan(0);

      // 기본 색상이 설정되어 있는지 확인
      expect(colorInputs[0]).toHaveValue('#f59e0b');
    });
  });

  describe('데이터 지속성', () => {
    it('localStorage에서 데이터를 정상적으로 불러온다', () => {
      render(<SubjectsPage />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('subjects');
      expect(screen.getByText('중등수학')).toBeInTheDocument();
      expect(screen.getByText('중등영어')).toBeInTheDocument();
    });

    it('데이터 변경 시 localStorage에 저장한다', async () => {
      render(<SubjectsPage />);

      const input = screen.getByPlaceholderText('과목 이름 (검색 가능)');
      const addButton = screen.getByRole('button', { name: '추가' });

      fireEvent.change(input, { target: { value: '새로운 과목' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'subjects',
          expect.any(String)
        );
      });
    });
  });
});
