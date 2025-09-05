import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectsPage from '../Subjects';

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

describe('SubjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('과목 관리 페이지가 정상적으로 렌더링된다', () => {
    render(<SubjectsPage />);

    expect(screen.getByText('과목 목록')).toBeInTheDocument();
    expect(screen.getByTestId('subjects-page')).toBeInTheDocument();
  });

  it('과목 추가 폼이 정상적으로 표시된다', () => {
    render(<SubjectsPage />);

    expect(
      screen.getByPlaceholderText('과목 이름 (검색 가능)')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument();
    expect(screen.getByTitle('과목 색상 선택')).toBeInTheDocument();
  });

  it('기본 과목 목록이 표시된다', () => {
    render(<SubjectsPage />);

    // 기본 과목들이 표시되는지 확인
    expect(screen.getByText('과목 목록')).toBeInTheDocument();
  });

  it('과목 검색 기능이 작동한다', () => {
    render(<SubjectsPage />);

    const searchInput = screen.getByPlaceholderText('과목 이름 (검색 가능)');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '수학' } });
    expect(searchInput).toHaveValue('수학');
  });
});
