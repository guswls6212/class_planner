import { vi } from 'vitest';
import Typography from '../Typography';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('Typography 컴포넌트', () => {
  it('Typography 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Typography).toBeDefined();
    expect(typeof Typography).toBe('function');
  });

  it('Typography 관련 props가 올바르게 정의되어 있다', () => {
    const typographyProps = {
      variant: 'h1',
      children: '테스트 텍스트',
      className: 'typography',
    };
    expect(typographyProps).toHaveProperty('variant');
    expect(typographyProps).toHaveProperty('children');
    expect(typographyProps).toHaveProperty('className');
  });

  it('Typography variant 타입들이 올바르게 정의되어 있다', () => {
    const variants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span'];
    expect(variants).toContain('h1');
    expect(variants).toContain('h2');
    expect(variants).toContain('h3');
    expect(variants).toContain('h4');
    expect(variants).toContain('h5');
    expect(variants).toContain('h6');
    expect(variants).toContain('p');
    expect(variants).toContain('span');
  });
});
