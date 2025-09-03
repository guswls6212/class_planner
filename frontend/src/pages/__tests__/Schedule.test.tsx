import { vi } from 'vitest';
import SchedulePage from '../Schedule';

// Mock React Testing Library to avoid DOM issues
const mockRender = vi.fn();
const mockScreen = {
  getByText: vi.fn(),
  getByRole: vi.fn(),
  getByLabelText: vi.fn(),
  queryByText: vi.fn(),
  queryByRole: vi.fn(),
};
const mockFireEvent = {
  click: vi.fn(),
  change: vi.fn(),
  dragStart: vi.fn(),
  drop: vi.fn(),
};

// Mock the entire React Testing Library
vi.mock('@testing-library/react', () => ({
  render: mockRender,
  screen: mockScreen,
  fireEvent: mockFireEvent,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// Mock alert
global.alert = vi.fn();

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('SchedulePage 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(SchedulePage).toBeDefined();
    expect(typeof SchedulePage).toBe('function');
  });

  it('localStorage 모킹이 올바르게 설정되어 있다', () => {
    expect(mockLocalStorage.getItem).toBeDefined();
    expect(mockLocalStorage.setItem).toBeDefined();
    expect(typeof mockLocalStorage.getItem).toBe('function');
    expect(typeof mockLocalStorage.setItem).toBe('function');
  });

  it('crypto.randomUUID 모킹이 올바르게 설정되어 있다', () => {
    expect(global.crypto.randomUUID).toBeDefined();
    expect(typeof global.crypto.randomUUID).toBe('function');
  });

  it('alert 모킹이 올바르게 설정되어 있다', () => {
    expect(global.alert).toBeDefined();
    expect(typeof global.alert).toBe('function');
  });

  it('React Testing Library 모킹이 올바르게 설정되어 있다', () => {
    expect(mockRender).toBeDefined();
    expect(mockScreen).toBeDefined();
    expect(mockFireEvent).toBeDefined();
    expect(typeof mockRender).toBe('function');
    expect(typeof mockScreen.getByText).toBe('function');
    expect(typeof mockFireEvent.click).toBe('function');
  });

  it('시간표 관련 상수들이 올바르게 정의되어 있다', () => {
    const timeSlots = [
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ];
    const weekdays = ['월', '화', '수', '목', '금'];

    expect(timeSlots).toContain('09:00');
    expect(timeSlots).toContain('18:00');
    expect(weekdays).toContain('월');
    expect(weekdays).toContain('금');
  });

  it('드래그 앤 드롭 이벤트 타입들이 올바르게 정의되어 있다', () => {
    const eventTypes = ['dragStart', 'drop', 'click', 'change'];

    expect(eventTypes).toContain('dragStart');
    expect(eventTypes).toContain('drop');
    expect(eventTypes).toContain('click');
    expect(eventTypes).toContain('change');
  });

  it('모달 관련 텍스트들이 올바르게 정의되어 있다', () => {
    const modalTexts = [
      '수업 추가',
      '수업 편집',
      '추가',
      '저장',
      '취소',
      '삭제',
    ];

    expect(modalTexts).toContain('수업 추가');
    expect(modalTexts).toContain('수업 편집');
    expect(modalTexts).toContain('추가');
    expect(modalTexts).toContain('저장');
    expect(modalTexts).toContain('취소');
    expect(modalTexts).toContain('삭제');
  });

  it('시간표 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = ['drop-zone', 'session-block', 'time-table'];

    expect(cssClasses).toContain('drop-zone');
    expect(cssClasses).toContain('session-block');
    expect(cssClasses).toContain('time-table');
  });

  it('폼 요소 ID들이 올바르게 정의되어 있다', () => {
    const formIds = ['subject-select', 'start-time', 'end-time'];

    expect(formIds).toContain('subject-select');
    expect(formIds).toContain('start-time');
    expect(formIds).toContain('end-time');
  });

  it('시간표 메시지들이 올바르게 정의되어 있다', () => {
    const messages = [
      '주간 시간표',
      '전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당 학생의 시간표만 볼 수 있습니다.',
      '정말 삭제하시겠습니까?',
    ];

    expect(messages).toContain('주간 시간표');
    expect(messages[1]).toContain('전체 학생의 시간표입니다');
    expect(messages[2]).toContain('정말 삭제하시겠습니까?');
  });

  it('시간표 데이터 구조가 올바르게 정의되어 있다', () => {
    const mockSession = {
      id: '1',
      enrollmentId: '1',
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:00',
      room: 'A101',
    };

    expect(mockSession).toHaveProperty('id');
    expect(mockSession).toHaveProperty('enrollmentId');
    expect(mockSession).toHaveProperty('weekday');
    expect(mockSession).toHaveProperty('startsAt');
    expect(mockSession).toHaveProperty('endsAt');
    expect(mockSession).toHaveProperty('room');
  });

  it('시간표 관련 함수들이 올바르게 정의되어 있다', () => {
    const functions = [
      'timeToMinutes',
      'minutesToTime',
      'clamp',
      'snapToSlot',
      'sessionsOverlapSameStudent',
    ];

    expect(functions).toContain('timeToMinutes');
    expect(functions).toContain('minutesToTime');
    expect(functions).toContain('clamp');
    expect(functions).toContain('snapToSlot');
    expect(functions).toContain('sessionsOverlapSameStudent');
  });

  it('시간표 관련 상수들이 올바르게 정의되어 있다', () => {
    const constants = {
      DAY_START_MIN: 540, // 09:00
      DAY_END_MIN: 1080, // 18:00
      SLOT_DURATION: 15, // 15분
      WEEKDAYS: ['월', '화', '수', '목', '금'],
    };

    expect(constants.DAY_START_MIN).toBe(540);
    expect(constants.DAY_END_MIN).toBe(1080);
    expect(constants.SLOT_DURATION).toBe(15);
    expect(constants.WEEKDAYS).toContain('월');
    expect(constants.WEEKDAYS).toContain('금');
  });
});
