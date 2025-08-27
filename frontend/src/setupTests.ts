import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
globalThis.localStorage = localStorageMock;

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock document.body for DOM manipulation
Object.defineProperty(document, 'body', {
  value: {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  writable: true,
});

// Mock document.createElement
globalThis.document.createElement = vi.fn(() => ({
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as unknown as typeof document.createElement;

// Mock document.documentElement.style for React DOM
Object.defineProperty(document, 'documentElement', {
  value: {
    style: new Proxy(
      {},
      {
        has: () => true, // 'in' 연산자가 항상 true를 반환
        get: () => '', // 모든 속성이 빈 문자열을 반환
      }
    ),
  },
  writable: true,
});

// Mock window.getComputedStyle
globalThis.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
})) as unknown as typeof getComputedStyle;

// Mock CSSStyleDeclaration for React DOM
const mockCSSStyleDeclaration = {
  WebkitAnimation: '',
  MozAnimation: '',
  msAnimation: '',
  OAnimation: '',
  animation: '',
  getPropertyValue: vi.fn(() => ''),
  setProperty: vi.fn(),
  removeProperty: vi.fn(),
  item: vi.fn(() => ''),
  length: 0,
  parentRule: null,
  cssText: '',
};

// Mock document.documentElement.style with proper CSSStyleDeclaration
Object.defineProperty(document.documentElement, 'style', {
  value: mockCSSStyleDeclaration,
  writable: true,
});

// Mock document.body.style
Object.defineProperty(document.body, 'style', {
  value: mockCSSStyleDeclaration,
  writable: true,
});

// Mock HTMLElement.prototype.style
Object.defineProperty(HTMLElement.prototype, 'style', {
  value: mockCSSStyleDeclaration,
  writable: true,
});

// 강력한 React DOM 모킹 - WebkitAnimation 문제 해결
Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
  value: vi.fn((eventName: string) => {
    // 모든 vendor prefix 이벤트에 대해 빈 문자열 반환
    if (eventName.includes('Webkit')) return '';
    if (eventName.includes('Moz')) return '';
    if (eventName.includes('ms')) return '';
    if (eventName.includes('O')) return '';
    return eventName;
  }),
  writable: true,
});

// React DOM의 이벤트 시스템 완전 모킹
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// React DOM의 내부 함수들을 모킹
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123'),
  },
  writable: true,
});

// Mock alert
globalThis.alert = vi.fn();
