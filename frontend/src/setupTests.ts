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
}));

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
}));

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

// Mock React DOM's getVendorPrefixedEventName function
const originalGetVendorPrefixedEventName =
  globalThis.getVendorPrefixedEventName;
if (originalGetVendorPrefixedEventName) {
  globalThis.getVendorPrefixedEventName = vi.fn(() => '');
}

// Mock React DOM's event system
Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
  value: vi.fn(() => ''),
  writable: true,
});

// Mock React DOM's event handling
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock React DOM's animation detection
Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
  value: vi.fn(eventName => {
    // React DOM이 WebkitAnimation을 찾을 때 빈 문자열 반환
    if (eventName === 'WebkitAnimation') return '';
    return eventName;
  }),
  writable: true,
});

// Mock React DOM's event system more comprehensively
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock React DOM's event handling
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock React DOM's animation detection more thoroughly
Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
  value: vi.fn(eventName => {
    // React DOM이 WebkitAnimation을 찾을 때 빈 문자열 반환
    if (eventName === 'WebkitAnimation') return '';
    if (eventName === 'MozAnimation') return '';
    if (eventName === 'msAnimation') return '';
    if (eventName === 'OAnimation') return '';
    return eventName;
  }),
  writable: true,
});

// Mock React DOM's event system
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock React DOM's event handling
Object.defineProperty(globalThis, 'getEventTarget', {
  value: vi.fn(() => document),
  writable: true,
});

// Mock React DOM's animation detection
Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
  value: vi.fn(eventName => {
    // React DOM이 WebkitAnimation을 찾을 때 빈 문자열 반환
    if (eventName === 'WebkitAnimation') return '';
    if (eventName === 'MozAnimation') return '';
    if (eventName === 'msAnimation') return '';
    if (eventName === 'OAnimation') return '';
    return eventName;
  }),
  writable: true,
});
