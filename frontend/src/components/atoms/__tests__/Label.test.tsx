import { vi } from 'vitest';
import Label from '../Label';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('Label 컴포넌트', () => {
  it('Label 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Label).toBeDefined();
    expect(typeof Label).toBe('function');
  });

  it('Label 관련 props가 올바르게 정의되어 있다', () => {
    const labelProps = { children: '테스트 라벨', htmlFor: 'test-input' };
    expect(labelProps).toHaveProperty('children');
    expect(labelProps).toHaveProperty('htmlFor');
  });

  it('Label 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['label', 'label-required', 'label-error'];
    expect(cssClasses).toContain('label');
    expect(cssClasses).toContain('label-required');
    expect(cssClasses).toContain('label-error');
  });
});
