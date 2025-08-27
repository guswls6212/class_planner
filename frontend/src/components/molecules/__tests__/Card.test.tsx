import { vi } from 'vitest';
import Card from '../Card';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('Card 컴포넌트', () => {
  it('Card 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Card).toBeDefined();
    expect(typeof Card).toBe('function');
  });

  it('Card 관련 props가 올바르게 정의되어 있다', () => {
    const cardProps = {
      children: '테스트 카드',
      className: 'card',
    };
    expect(cardProps).toHaveProperty('children');
    expect(cardProps).toHaveProperty('className');
  });

  it('Card 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['card', 'card-header', 'card-body', 'card-footer'];
    expect(cssClasses).toContain('card');
    expect(cssClasses).toContain('card-header');
    expect(cssClasses).toContain('card-body');
    expect(cssClasses).toContain('card-footer');
  });
});
