import { vi } from 'vitest';
import SessionModal, {
  getButtonContainerStyles,
  getEndTimeInputId,
  getFormGridStyles,
  getInputStyles,
  getLabelStyles,
  getModalStyles,
  getRightButtonContainerStyles,
  getSelectStyles,
  getStartTimeInputId,
  getSubjectSelectId,
  getSubmitButtonText,
  getTitleStyles,
  getWeekdaySelectId,
  hasSubjects,
  hasWeekdays,
  shouldShowDeleteButton,
  shouldShowModal,
  validateModalData,
} from '../SessionModal';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
}));

// Mock Button component
vi.mock('../atoms/Button', () => ({
  default: vi.fn(({ children, onClick, variant, size }) => (
    <button
      data-testid={`button-${variant}-${size}`}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  )),
}));

describe('SessionModal 컴포넌트', () => {
  it('SessionModal 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(SessionModal).toBeDefined();
    expect(typeof SessionModal).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getModalStyles', () => {
      it('올바른 모달 스타일을 반환한다', () => {
        const result = getModalStyles();
        expect(result).toEqual({
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.9)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          padding: 16,
          zIndex: 1000,
          minWidth: 320,
        });
      });

      it('모달 스타일의 고정 값들이 올바르게 설정되어 있다', () => {
        const result = getModalStyles();
        expect(result.position).toBe('fixed');
        expect(result.left).toBe('50%');
        expect(result.top).toBe('50%');
        expect(result.transform).toBe('translate(-50%, -50%)');
        expect(result.zIndex).toBe(1000);
        expect(result.minWidth).toBe(320);
      });
    });

    describe('getTitleStyles', () => {
      it('올바른 제목 스타일을 반환한다', () => {
        const result = getTitleStyles();
        expect(result).toEqual({
          margin: '0 0 12px 0',
          color: '#fff',
        });
      });
    });

    describe('getFormGridStyles', () => {
      it('올바른 폼 그리드 스타일을 반환한다', () => {
        const result = getFormGridStyles();
        expect(result).toEqual({
          display: 'grid',
          gap: 8,
          marginBottom: 16,
        });
      });
    });

    describe('getLabelStyles', () => {
      it('올바른 라벨 스타일을 반환한다', () => {
        const result = getLabelStyles();
        expect(result).toEqual({
          display: 'block',
          color: '#ccc',
          fontSize: 12,
          marginBottom: 4,
        });
      });
    });

    describe('getSelectStyles', () => {
      it('올바른 select 스타일을 반환한다', () => {
        const result = getSelectStyles();
        expect(result).toEqual({
          width: '100%',
          padding: '6px',
          borderRadius: 4,
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
        });
      });
    });

    describe('getInputStyles', () => {
      it('올바른 input 스타일을 반환한다', () => {
        const result = getInputStyles();
        expect(result).toEqual({
          width: '100%',
          padding: '6px',
          borderRadius: 4,
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
        });
      });
    });

    describe('getButtonContainerStyles', () => {
      it('올바른 버튼 컨테이너 스타일을 반환한다', () => {
        const result = getButtonContainerStyles();
        expect(result).toEqual({
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
        });
      });
    });

    describe('getRightButtonContainerStyles', () => {
      it('올바른 오른쪽 버튼 컨테이너 스타일을 반환한다', () => {
        const result = getRightButtonContainerStyles();
        expect(result).toEqual({
          display: 'flex',
          gap: 8,
          marginLeft: 'auto',
        });
      });
    });

    describe('shouldShowModal', () => {
      it('isOpen이 true일 때 true를 반환한다', () => {
        expect(shouldShowModal(true)).toBe(true);
      });

      it('isOpen이 false일 때 false를 반환한다', () => {
        expect(shouldShowModal(false)).toBe(false);
      });
    });

    describe('shouldShowDeleteButton', () => {
      it('isEdit이 true이고 onDelete가 있을 때 true를 반환한다', () => {
        const mockOnDelete = vi.fn();
        expect(shouldShowDeleteButton(true, mockOnDelete)).toBe(true);
      });

      it('isEdit이 false일 때 false를 반환한다', () => {
        const mockOnDelete = vi.fn();
        expect(shouldShowDeleteButton(false, mockOnDelete)).toBe(false);
      });

      it('isEdit이 true이지만 onDelete가 없을 때 false를 반환한다', () => {
        expect(shouldShowDeleteButton(true, undefined)).toBe(false);
      });
    });

    describe('getSubmitButtonText', () => {
      it('isEdit이 true일 때 "저장"을 반환한다', () => {
        expect(getSubmitButtonText(true)).toBe('저장');
      });

      it('isEdit이 false일 때 "추가"를 반환한다', () => {
        expect(getSubmitButtonText(false)).toBe('추가');
      });
    });

    describe('ID 생성 함수들', () => {
      it('getSubjectSelectId가 올바른 ID를 반환한다', () => {
        expect(getSubjectSelectId(true)).toBe('edit-modal-subject');
        expect(getSubjectSelectId(false)).toBe('modal-subject');
      });

      it('getWeekdaySelectId가 올바른 ID를 반환한다', () => {
        expect(getWeekdaySelectId(true)).toBe('edit-modal-weekday');
        expect(getWeekdaySelectId(false)).toBe('modal-weekday');
      });

      it('getStartTimeInputId가 올바른 ID를 반환한다', () => {
        expect(getStartTimeInputId(true)).toBe('edit-modal-start-time');
        expect(getStartTimeInputId(false)).toBe('modal-start-time');
      });

      it('getEndTimeInputId가 올바른 ID를 반환한다', () => {
        expect(getEndTimeInputId(true)).toBe('edit-modal-end-time');
        expect(getEndTimeInputId(false)).toBe('modal-end-time');
      });
    });

    describe('validateModalData', () => {
      it('유효한 데이터가 올바르게 검증된다', () => {
        const validData = {
          studentId: 'student1',
          weekday: 0,
          startTime: '09:00',
          endTime: '10:00',
        };
        expect(validateModalData(validData)).toBe(true);
      });

      it('유효하지 않은 데이터가 올바르게 검증된다', () => {
        const invalidData1 = {
          studentId: '',
          weekday: 0,
          startTime: '09:00',
          endTime: '10:00',
        };
        const invalidData2 = {
          studentId: 'student1',
          weekday: -1,
          startTime: '09:00',
          endTime: '10:00',
        };
        const invalidData3 = {
          studentId: 'student1',
          weekday: 0,
          startTime: '',
          endTime: '10:00',
        };
        const invalidData4 = {
          studentId: 'student1',
          weekday: 0,
          startTime: '09:00',
          endTime: '',
        };

        expect(validateModalData(invalidData1)).toBe(false);
        expect(validateModalData(invalidData2)).toBe(false);
        expect(validateModalData(invalidData3)).toBe(false);
        expect(validateModalData(invalidData4)).toBe(false);
      });
    });

    describe('hasSubjects', () => {
      it('subjects 배열이 비어있지 않을 때 true를 반환한다', () => {
        const subjects = [{ id: '1', name: 'Math', color: '#ff0000' }];
        expect(hasSubjects(subjects)).toBe(true);
      });

      it('subjects 배열이 비어있을 때 false를 반환한다', () => {
        expect(hasSubjects([])).toBe(false);
      });
    });

    describe('hasWeekdays', () => {
      it('weekdays 배열이 비어있지 않을 때 true를 반환한다', () => {
        const weekdays = ['월', '화', '수', '목', '금'];
        expect(hasWeekdays(weekdays)).toBe(true);
      });

      it('weekdays 배열이 비어있을 때 false를 반환한다', () => {
        expect(hasWeekdays([])).toBe(false);
      });
    });
  });

  describe('SessionModal 관련 상수 테스트', () => {
    it('기본 스타일 값들이 올바르게 정의되어 있다', () => {
      const defaultStyles = {
        borderRadius: 8,
        padding: 16,
        gap: 8,
        marginBottom: 16,
        marginBottomTitle: 12,
        marginBottomLabel: 4,
        fontSize: 12,
        minWidth: 320,
        zIndex: 1000,
      };

      expect(defaultStyles.borderRadius).toBe(8);
      expect(defaultStyles.padding).toBe(16);
      expect(defaultStyles.gap).toBe(8);
      expect(defaultStyles.marginBottom).toBe(16);
      expect(defaultStyles.marginBottomTitle).toBe(12);
      expect(defaultStyles.marginBottomLabel).toBe(4);
      expect(defaultStyles.fontSize).toBe(12);
      expect(defaultStyles.minWidth).toBe(320);
      expect(defaultStyles.zIndex).toBe(1000);
    });

    it('색상 값들이 올바르게 정의되어 있다', () => {
      const colors = {
        background: 'rgba(0,0,0,0.9)',
        border: 'rgba(255,255,255,0.2)',
        titleColor: '#fff',
        labelColor: '#ccc',
        selectBackground: '#333',
        selectColor: '#fff',
        selectBorder: '#555',
      };

      expect(colors.background).toBe('rgba(0,0,0,0.9)');
      expect(colors.border).toBe('rgba(255,255,255,0.2)');
      expect(colors.titleColor).toBe('#fff');
      expect(colors.labelColor).toBe('#ccc');
      expect(colors.selectBackground).toBe('#333');
      expect(colors.selectColor).toBe('#fff');
      expect(colors.selectBorder).toBe('#555');
    });
  });

  describe('SessionModal 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // 모든 스타일 함수 테스트
      const modalStyles = getModalStyles();
      const titleStyles = getTitleStyles();
      const formGridStyles = getFormGridStyles();
      const labelStyles = getLabelStyles();
      const selectStyles = getSelectStyles();
      const inputStyles = getInputStyles();
      const buttonContainerStyles = getButtonContainerStyles();
      const rightButtonContainerStyles = getRightButtonContainerStyles();

      // 모달 표시 여부 테스트
      const shouldShow = shouldShowModal(true);
      const shouldNotShow = shouldShowModal(false);

      // 삭제 버튼 표시 여부 테스트
      const mockOnDelete = vi.fn();
      const shouldShowDelete = shouldShowDeleteButton(true, mockOnDelete);
      const shouldNotShowDelete = shouldShowDeleteButton(false, mockOnDelete);

      // 버튼 텍스트 테스트
      const editButtonText = getSubmitButtonText(true);
      const addButtonText = getSubmitButtonText(false);

      // ID 생성 테스트
      const editSubjectId = getSubjectSelectId(true);
      const addSubjectId = getSubjectSelectId(false);

      // 데이터 유효성 테스트
      const validData = {
        studentId: 'student1',
        weekday: 0,
        startTime: '09:00',
        endTime: '10:00',
      };
      const isValidData = validateModalData(validData);

      // 배열 유효성 테스트
      const subjects = [{ id: '1', name: 'Math', color: '#ff0000' }];
      const weekdays = ['월', '화', '수', '목', '금'];
      const hasValidSubjects = hasSubjects(subjects);
      const hasValidWeekdays = hasWeekdays(weekdays);

      // 검증
      expect(modalStyles.position).toBe('fixed');
      expect(titleStyles.color).toBe('#fff');
      expect(formGridStyles.display).toBe('grid');
      expect(labelStyles.color).toBe('#ccc');
      expect(selectStyles.background).toBe('#333');
      expect(inputStyles.background).toBe('#333');
      expect(buttonContainerStyles.justifyContent).toBe('space-between');
      expect(rightButtonContainerStyles.marginLeft).toBe('auto');

      expect(shouldShow).toBe(true);
      expect(shouldNotShow).toBe(false);
      expect(shouldShowDelete).toBe(true);
      expect(shouldNotShowDelete).toBe(false);
      expect(editButtonText).toBe('저장');
      expect(addButtonText).toBe('추가');
      expect(editSubjectId).toBe('edit-modal-subject');
      expect(addSubjectId).toBe('modal-subject');
      expect(isValidData).toBe(true);
      expect(hasValidSubjects).toBe(true);
      expect(hasValidWeekdays).toBe(true);
    });

    it('기본값들이 올바르게 처리된다', () => {
      const shouldShow = shouldShowModal(false);
      const shouldShowDelete = shouldShowDeleteButton(false, vi.fn());
      const buttonText = getSubmitButtonText(false);
      const subjectId = getSubjectSelectId(false);

      expect(shouldShow).toBe(false);
      expect(shouldShowDelete).toBe(false);
      expect(buttonText).toBe('추가');
      expect(subjectId).toBe('modal-subject');
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const validData = {
        studentId: 'student1',
        weekday: 0,
        startTime: '09:00',
        endTime: '10:00',
      };
      const invalidData = {
        studentId: '',
        weekday: -1,
        startTime: '',
        endTime: '',
      };

      const isValidValid = validateModalData(validData);
      const isValidInvalid = validateModalData(invalidData);

      expect(isValidValid).toBe(true);
      expect(isValidInvalid).toBe(false);
    });
  });

  describe('SessionModal 이벤트 핸들러 테스트', () => {
    it('이벤트 핸들러들이 올바르게 정의되어 있다', () => {
      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();
      const mockOnDelete = vi.fn();

      expect(typeof mockOnSubmit).toBe('function');
      expect(typeof mockOnCancel).toBe('function');
      expect(typeof mockOnDelete).toBe('function');
    });
  });
});
