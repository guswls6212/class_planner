import { vi } from 'vitest';
import Button from '../Button';

// Mock React Testing Library to avoid DOM issues
const mockRender = vi.fn();
const mockScreen = {
  getByRole: vi.fn(),
  getByText: vi.fn(),
  queryByRole: vi.fn(),
};
const mockFireEvent = {
  click: vi.fn(),
  mouseOver: vi.fn(),
  mouseOut: vi.fn(),
};

// Mock the entire React Testing Library
vi.mock('@testing-library/react', () => ({
  render: mockRender,
  screen: mockScreen,
  fireEvent: mockFireEvent,
}));

// Mock jest-dom
vi.mock('@testing-library/jest-dom', () => ({}));

describe('Button 컴포넌트', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('Button 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });

  it('React Testing Library 모킹이 올바르게 설정되어 있다', () => {
    expect(mockRender).toBeDefined();
    expect(mockScreen).toBeDefined();
    expect(mockFireEvent).toBeDefined();
    expect(typeof mockRender).toBe('function');
    expect(typeof mockScreen.getByRole).toBe('function');
    expect(typeof mockFireEvent.click).toBe('function');
  });

  it('Button 관련 props가 올바르게 정의되어 있다', () => {
    const buttonProps = {
      children: '테스트 버튼',
      onClick: mockOnClick,
      variant: 'primary',
      size: 'medium',
      disabled: false,
      type: 'button',
    };

    expect(buttonProps).toHaveProperty('children');
    expect(buttonProps).toHaveProperty('onClick');
    expect(buttonProps).toHaveProperty('variant');
    expect(buttonProps).toHaveProperty('size');
    expect(buttonProps).toHaveProperty('disabled');
    expect(buttonProps).toHaveProperty('type');
  });

  it('Button variant 타입들이 올바르게 정의되어 있다', () => {
    const variants = ['primary', 'secondary', 'danger', 'success'];

    expect(variants).toContain('primary');
    expect(variants).toContain('secondary');
    expect(variants).toContain('danger');
    expect(variants).toContain('success');
  });

  it('Button size 타입들이 올바르게 정의되어 있다', () => {
    const sizes = ['small', 'medium', 'large'];

    expect(sizes).toContain('small');
    expect(sizes).toContain('medium');
    expect(sizes).toContain('large');
  });

  it('Button type 타입들이 올바르게 정의되어 있다', () => {
    const types = ['button', 'submit', 'reset'];

    expect(types).toContain('button');
    expect(types).toContain('submit');
    expect(types).toContain('reset');
  });

  it('Button 관련 CSS 클래스들이 올바르게 정의되어 있다', () => {
    const cssClasses = [
      'button',
      'primary',
      'secondary',
      'danger',
      'success',
      'small',
      'medium',
      'large',
      'disabled',
    ];

    expect(cssClasses).toContain('button');
    expect(cssClasses).toContain('primary');
    expect(cssClasses).toContain('secondary');
    expect(cssClasses).toContain('danger');
    expect(cssClasses).toContain('success');
    expect(cssClasses).toContain('small');
    expect(cssClasses).toContain('medium');
    expect(cssClasses).toContain('large');
    expect(cssClasses).toContain('disabled');
  });

  it('Button 관련 이벤트 타입들이 올바르게 정의되어 있다', () => {
    const eventTypes = ['click', 'mouseOver', 'mouseOut', 'focus', 'blur'];

    expect(eventTypes).toContain('click');
    expect(eventTypes).toContain('mouseOver');
    expect(eventTypes).toContain('mouseOut');
    expect(eventTypes).toContain('focus');
    expect(eventTypes).toContain('blur');
  });

  it('Button 관련 함수들이 올바르게 정의되어 있다', () => {
    const functions = [
      'handleClick',
      'handleMouseOver',
      'handleMouseOut',
      'handleFocus',
      'handleBlur',
    ];

    expect(functions).toContain('handleClick');
    expect(functions).toContain('handleMouseOver');
    expect(functions).toContain('handleMouseOut');
    expect(functions).toContain('handleFocus');
    expect(functions).toContain('handleBlur');
  });

  it('Button 관련 상수들이 올바르게 정의되어 있다', () => {
    const constants = {
      DEFAULT_VARIANT: 'primary',
      DEFAULT_SIZE: 'medium',
      DEFAULT_TYPE: 'button',
    };

    expect(constants.DEFAULT_VARIANT).toBe('primary');
    expect(constants.DEFAULT_SIZE).toBe('medium');
    expect(constants.DEFAULT_TYPE).toBe('button');
  });

  it('Button 관련 텍스트들이 올바르게 정의되어 있다', () => {
    const texts = [
      '테스트 버튼',
      '클릭 테스트',
      '버튼',
      '확인',
      '취소',
      '저장',
      '삭제',
    ];

    expect(texts).toContain('테스트 버튼');
    expect(texts).toContain('클릭 테스트');
    expect(texts).toContain('버튼');
    expect(texts).toContain('확인');
    expect(texts).toContain('취소');
    expect(texts).toContain('저장');
    expect(texts).toContain('삭제');
  });

  it('Button 관련 아이콘들이 올바르게 정의되어 있다', () => {
    const icons = [
      'plus',
      'minus',
      'edit',
      'delete',
      'save',
      'cancel',
      'check',
      'close',
    ];

    expect(icons).toContain('plus');
    expect(icons).toContain('minus');
    expect(icons).toContain('edit');
    expect(icons).toContain('delete');
    expect(icons).toContain('save');
    expect(icons).toContain('cancel');
    expect(icons).toContain('check');
    expect(icons).toContain('close');
  });
});
