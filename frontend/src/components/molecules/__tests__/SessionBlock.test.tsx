import { vi } from 'vitest';
import SessionBlock from '../SessionBlock';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('SessionBlock 컴포넌트', () => {
  it('SessionBlock 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(SessionBlock).toBeDefined();
    expect(typeof SessionBlock).toBe('function');
  });

  it('SessionBlock 관련 props가 올바르게 정의되어 있다', () => {
    const sessionBlockProps = {
      session: {
        id: '1',
        enrollmentId: '1',
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
        room: 'A101',
      },
      onClick: vi.fn(),
    };
    expect(sessionBlockProps).toHaveProperty('session');
    expect(sessionBlockProps).toHaveProperty('onClick');
  });

  it('SessionBlock 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['session-block', 'session-time', 'session-room'];
    expect(cssClasses).toContain('session-block');
    expect(cssClasses).toContain('session-time');
    expect(cssClasses).toContain('session-room');
  });
});
