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
