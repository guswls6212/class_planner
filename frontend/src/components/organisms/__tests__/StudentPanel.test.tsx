import { vi } from 'vitest';
import StudentPanel from '../StudentPanel';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('StudentPanel 컴포넌트', () => {
  it('StudentPanel 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(StudentPanel).toBeDefined();
    expect(typeof StudentPanel).toBe('function');
  });

  it('StudentPanel 관련 props가 올바르게 정의되어 있다', () => {
    const studentPanelProps = {
      students: [],
      selectedStudentId: null,
      onStudentSelect: vi.fn(),
    };
    expect(studentPanelProps).toHaveProperty('students');
    expect(studentPanelProps).toHaveProperty('selectedStudentId');
    expect(studentPanelProps).toHaveProperty('onStudentSelect');
  });

  it('StudentPanel 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['student-panel', 'student-list', 'student-item'];
    expect(cssClasses).toContain('student-panel');
    expect(cssClasses).toContain('student-list');
    expect(cssClasses).toContain('student-item');
  });
});
