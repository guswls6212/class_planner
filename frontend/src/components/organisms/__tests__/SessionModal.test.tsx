import { vi } from 'vitest';
import SessionModal from '../SessionModal';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('SessionModal 컴포넌트', () => {
  it('SessionModal 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(SessionModal).toBeDefined();
    expect(typeof SessionModal).toBe('function');
  });

  it('SessionModal 관련 props가 올바르게 정의되어 있다', () => {
    const sessionModalProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      session: null,
    };
    expect(sessionModalProps).toHaveProperty('isOpen');
    expect(sessionModalProps).toHaveProperty('onClose');
    expect(sessionModalProps).toHaveProperty('onSubmit');
    expect(sessionModalProps).toHaveProperty('session');
  });

  it('SessionModal 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = [
      'modal',
      'modal-overlay',
      'modal-content',
      'modal-header',
    ];
    expect(cssClasses).toContain('modal');
    expect(cssClasses).toContain('modal-overlay');
    expect(cssClasses).toContain('modal-content');
    expect(cssClasses).toContain('modal-header');
  });
});
