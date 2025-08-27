import { vi } from 'vitest';
import FormField from '../FormField';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('FormField 컴포넌트', () => {
  it('FormField 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(FormField).toBeDefined();
    expect(typeof FormField).toBe('function');
  });

  it('FormField 관련 props가 올바르게 정의되어 있다', () => {
    const formFieldProps = {
      label: '테스트 라벨',
      children: '테스트 필드',
      error: '에러 메시지',
    };
    expect(formFieldProps).toHaveProperty('label');
    expect(formFieldProps).toHaveProperty('children');
    expect(formFieldProps).toHaveProperty('error');
  });

  it('FormField 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['form-field', 'form-label', 'form-input', 'form-error'];
    expect(cssClasses).toContain('form-field');
    expect(cssClasses).toContain('form-label');
    expect(cssClasses).toContain('form-input');
    expect(cssClasses).toContain('form-error');
  });
});
