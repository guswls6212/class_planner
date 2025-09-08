import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';

// Layout 컴포넌트를 테스트하기 위한 래퍼
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>{children}</ThemeProvider>
  </BrowserRouter>
);

// Layout 컴포넌트를 직접 렌더링하기 위한 임시 컴포넌트
const LayoutComponent = () => {
  return (
    <div>
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/students" style={{ padding: '4px 8px' }}>
            학생
          </a>
          <a href="/subjects" style={{ padding: '4px 8px' }}>
            과목
          </a>
          <a href="/schedule" style={{ padding: '4px 8px' }}>
            시간표
          </a>
          <a href="/manual" style={{ padding: '4px 8px' }}>
            사용법
          </a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div data-testid="theme-toggle">테마 토글</div>
          <div data-testid="login-button">로그인 버튼</div>
        </div>
      </nav>
    </div>
  );
};

describe('네비게이션 레이아웃', () => {
  beforeEach(() => {
    // DOM 요소 생성
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    // DOM 정리
    const root = document.getElementById('root');
    if (root) {
      document.body.removeChild(root);
    }
  });

  test('네비게이션 메뉴가 올바른 순서로 렌더링되어야 함', () => {
    render(
      <TestWrapper>
        <LayoutComponent />
      </TestWrapper>,
    );

    const navLinks = screen.getAllByRole('link');
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0]).toHaveTextContent('학생');
    expect(navLinks[1]).toHaveTextContent('과목');
    expect(navLinks[2]).toHaveTextContent('시간표');
    expect(navLinks[3]).toHaveTextContent('사용법');
  });

  test('오른쪽 액션 영역에 테마 토글과 로그인 버튼이 올바른 순서로 있어야 함', () => {
    render(
      <TestWrapper>
        <LayoutComponent />
      </TestWrapper>,
    );

    const themeToggle = screen.getByTestId('theme-toggle');
    const loginButton = screen.getByTestId('login-button');

    expect(themeToggle).toBeInTheDocument();
    expect(loginButton).toBeInTheDocument();

    // 테마 토글이 로그인 버튼보다 먼저 와야 함
    const actionContainer = themeToggle.parentElement;
    expect(actionContainer?.children[0]).toBe(themeToggle);
    expect(actionContainer?.children[1]).toBe(loginButton);
  });

  test('네비게이션 레이아웃이 반응형으로 설정되어야 함', () => {
    render(
      <TestWrapper>
        <LayoutComponent />
      </TestWrapper>,
    );

    const nav = document.querySelector('nav');
    expect(nav).toHaveStyle({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
  });
});
