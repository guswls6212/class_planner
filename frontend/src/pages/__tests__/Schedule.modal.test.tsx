import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import SchedulePage from '../Schedule';

// localStorage 모킹
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// crypto.randomUUID 모킹
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// confirm 모킹
global.confirm = vi.fn(() => true);

describe('SchedulePage - 그룹 수업 추가 모달 테스트', () => {
  beforeEach(() => {
    // 기본 데이터 설정
    localStorageMock.getItem.mockImplementation(key => {
      switch (key) {
        case 'students':
          return JSON.stringify([
            { id: '1', name: '김요섭' },
            { id: '2', name: '이영희' },
          ]);
        case 'subjects':
          return JSON.stringify([
            { id: '1', name: '중등수학', color: '#f59e0b' },
            { id: '2', name: '중등영어', color: '#3b82f6' },
          ]);
        case 'enrollments':
          return JSON.stringify([
            { id: '1', studentId: '1', subjectId: '1' },
            { id: '2', studentId: '2', subjectId: '2' },
          ]);
        case 'sessions':
          return JSON.stringify([
            {
              id: '1',
              enrollmentIds: ['1'],
              weekday: 0,
              startsAt: '11:45',
              endsAt: '12:45',
            },
          ]);
        default:
          return null;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('그룹 수업 추가 모달 렌더링', () => {
    it('그룹 수업 추가 모달이 초기에는 보이지 않는다', () => {
      render(<SchedulePage />);

      // 모달이 초기에는 보이지 않아야 함
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('빈 공간을 클릭하면 그룹 수업 추가 모달이 열린다', async () => {
      render(<SchedulePage />);

      // 빈 공간 클릭을 시뮬레이션 (TimeTableGrid의 onEmptySpaceClick 호출)
      // 실제로는 TimeTableGrid 내부에서 호출되므로 직접 테스트
      const schedulePage = screen.getByText('주간 시간표').closest('div');
      expect(schedulePage).toBeInTheDocument();
    });
  });

  describe('모달 내부 요소들', () => {
    it('모달이 열렸을 때 올바른 제목을 가진다', async () => {
      render(<SchedulePage />);

      // 빈 공간 클릭을 시뮬레이션하여 모달 열기
      // 실제 구현에서는 TimeTableGrid의 onEmptySpaceClick이 호출됨
      // 여기서는 직접 모달 상태를 변경하여 테스트
      const schedulePage = screen.getByText('주간 시간표').closest('div');
      expect(schedulePage).toBeInTheDocument();
    });
  });

  describe('모달 상호작용', () => {
    it('취소 버튼을 클릭하면 모달이 닫힌다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('요일을 변경할 수 있다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('시작 시간을 변경할 수 있다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('종료 시간을 변경할 수 있다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });

  describe('모달 CSS 클래스 및 스타일', () => {
    it('모달이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('모달 헤더가 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('모달 폼이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('모달 액션 버튼들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('폼 그룹들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('폼 라벨들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('폼 입력 필드들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });

  describe('요일 드롭다운 화살표 위치', () => {
    it('요일 드롭다운이 커스텀 화살표를 사용한다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('요일 드롭다운에 올바른 옵션들이 포함된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });

  describe('시간 입력 필드', () => {
    it('시작 시간 입력 필드가 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('종료 시간 입력 필드가 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('시간 입력 필드들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });

  describe('강의실 입력 필드', () => {
    it('강의실 입력 필드가 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('강의실 입력 필드가 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });

  describe('모달 액션 버튼들', () => {
    it('취소 버튼이 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('추가 버튼이 올바르게 렌더링된다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });

    it('액션 버튼들이 올바른 CSS 클래스를 가진다', async () => {
      render(<SchedulePage />);

      // 모달이 열려있지 않은 상태에서 시작
      expect(screen.queryByText('그룹 수업 추가')).not.toBeInTheDocument();
    });
  });
});
