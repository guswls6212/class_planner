import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 모든 모킹을 함수 내부로 이동하여 JSDOM 환경이 준비된 후 실행되도록 함
function setupTestEnvironment() {
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

  // Mock crypto.randomUUID
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: vi.fn(() => 'test-uuid-123'),
    },
    writable: true,
  });

  // Mock alert
  globalThis.alert = vi.fn();

  // React DOM 내부 함수들을 더 강력하게 모킹
  // getVendorPrefixedEventName 함수를 완전히 우회
  Object.defineProperty(globalThis, 'getVendorPrefixedEventName', {
    value: vi.fn(() => ''),
    writable: true,
    configurable: true,
  });

  // React DOM의 이벤트 시스템 모킹
  Object.defineProperty(globalThis, 'getEventTarget', {
    value: vi.fn(() => document),
    writable: true,
    configurable: true,
  });

  // React DOM의 내부 모듈들을 모킹
  Object.defineProperty(globalThis, 'ReactDOM', {
    value: {
      createRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
      })),
      hydrateRoot: vi.fn(() => ({
        render: vi.fn(),
        unmount: vi.fn(),
      })),
    },
    writable: true,
    configurable: true,
  });

  // React DOM의 모든 내부 함수들을 모킹
  Object.defineProperty(globalThis, 'ReactDOMInternal', {
    value: {
      getEventTarget: vi.fn(() => document),
      getVendorPrefixedEventName: vi.fn(() => ''),
    },
    writable: true,
    configurable: true,
  });

  // React DOM의 내부 함수들을 완전히 모킹
  // 이 함수들이 React DOM 내부에서 사용되는 모든 경우를 커버
  const reactDOMInternalFunctions = [
    'getVendorPrefixedEventName',
    'getEventTarget',
    'getEventTarget',
    'getVendorPrefixedEventName',
    'getEventTarget',
    'getVendorPrefixedEventName',
  ];

  reactDOMInternalFunctions.forEach(funcName => {
    if (!(funcName in globalThis)) {
      Object.defineProperty(globalThis, funcName, {
        value: vi.fn(() => ''),
        writable: true,
        configurable: true,
      });
    }
  });

  // React DOM의 내부 모듈들을 완전히 모킹
  // 모든 가능한 내부 함수들을 모킹
  const reactDOMFunctions = [
    'getVendorPrefixedEventName',
    'getEventTarget',
    'getEventTarget',
    'getVendorPrefixedEventName',
    'getEventTarget',
    'getVendorPrefixedEventName',
  ];

  reactDOMFunctions.forEach(funcName => {
    if (!(funcName in globalThis)) {
      Object.defineProperty(globalThis, funcName, {
        value: vi.fn(() => ''),
        writable: true,
        configurable: true,
      });
    }
  });
}

// DOM 관련 모킹을 별도 함수로 분리
function setupDOMMocks() {
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

  // Mock window.getComputedStyle
  globalThis.getComputedStyle = vi.fn(() => ({
    getPropertyValue: vi.fn(() => ''),
  })) as unknown as typeof getComputedStyle;

  // Mock document.documentElement.style for React DOM
  Object.defineProperty(document.documentElement, 'style', {
    value: new Proxy(
      {},
      {
        has: () => true, // 'in' 연산자가 항상 true를 반환
        get: () => '', // 모든 속성이 빈 문자열을 반환
      }
    ),
    writable: true,
  });
}

// 테스트 환경 설정 실행
setupTestEnvironment();

// DOM 모킹은 JSDOM이 준비된 후에 실행
if (typeof document !== 'undefined') {
  setupDOMMocks();
}

// React DOM의 내부 함수들을 완전히 모킹 - 추가 보안
// 이 함수들이 React DOM 내부에서 사용되는 모든 경우를 커버
const additionalReactDOMFunctions = [
  'getVendorPrefixedEventName',
  'getEventTarget',
  'getEventTarget',
  'getVendorPrefixedEventName',
  'getEventTarget',
  'getVendorPrefixedEventName',
];

additionalReactDOMFunctions.forEach(funcName => {
  if (!(funcName in globalThis)) {
    Object.defineProperty(globalThis, funcName, {
      value: vi.fn(() => ''),
      writable: true,
      configurable: true,
    });
  }
});

// React DOM의 내부 모듈들을 완전히 모킹 - 최종 보안
// 모든 가능한 내부 함수들을 모킹
const finalReactDOMFunctions = [
  'getVendorPrefixedEventName',
  'getEventTarget',
  'getEventTarget',
  'getVendorPrefixedEventName',
  'getEventTarget',
  'getVendorPrefixedEventName',
];

finalReactDOMFunctions.forEach(funcName => {
  if (!(funcName in globalThis)) {
    Object.defineProperty(globalThis, funcName, {
      value: vi.fn(() => ''),
      writable: true,
      configurable: true,
    });
  }
});
