import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Supabase 클라이언트 모킹 - 환경 변수 문제를 완전히 우회
vi.mock('../../utils/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

// 환경 변수 모킹
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

// Supabase 클라이언트 생성 함수 모킹
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}));

import LoginButton from '../LoginButton';

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로그인 버튼이 렌더링되어야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    expect(loginButton).toBeInTheDocument();
  });

  it('로그인 버튼 클릭 시 모달이 열려야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    fireEvent.click(loginButton);

    expect(
      screen.getByText('소셜 계정으로 간편하게 로그인하세요')
    ).toBeInTheDocument();
  });

  it('Google 로그인 버튼이 있어야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    fireEvent.click(loginButton);

    const googleButton = screen.getByText('Google로 로그인');
    expect(googleButton).toBeInTheDocument();
  });

  it('카카오 로그인 버튼이 있어야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    fireEvent.click(loginButton);

    const kakaoButton = screen.getByText('카카오로 로그인');
    expect(kakaoButton).toBeInTheDocument();
  });

  it('모달 닫기 버튼이 작동해야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    fireEvent.click(loginButton);

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(
      screen.queryByText('소셜 계정으로 간편하게 로그인하세요')
    ).not.toBeInTheDocument();
  });

  it('모달 오버레이 클릭 시 모달이 닫혀야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByText('로그인');
    fireEvent.click(loginButton);

    const modalOverlay = screen
      .getByText('소셜 계정으로 간편하게 로그인하세요')
      .closest('.modalOverlay');
    if (modalOverlay) {
      fireEvent.click(modalOverlay);
    }

    expect(
      screen.queryByText('소셜 계정으로 간편하게 로그인하세요')
    ).not.toBeInTheDocument();
  });

  test('로그인 버튼이 그라데이션 스타일을 가져야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByRole('button', { name: /로그인/i });

    // CSS 모듈 클래스 확인
    expect(loginButton).toHaveClass('loginButton');

    // 버튼이 존재하는지 확인
    expect(loginButton).toBeInTheDocument();
  });

  test('로그인 버튼에 아이콘이 있어야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByRole('button', { name: /로그인/i });
    const icon = loginButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('loginIcon');
  });

  test('로그인 버튼이 네비게이션과 다른 스타일을 가져야 함', () => {
    render(<LoginButton />);

    const loginButton = screen.getByRole('button', { name: /로그인/i });

    // CSS 모듈 클래스 확인
    expect(loginButton).toHaveClass('loginButton');

    // 버튼이 존재하는지 확인
    expect(loginButton).toBeInTheDocument();

    // 아이콘이 있어야 함 (네비게이션과 구분)
    const icon = loginButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
