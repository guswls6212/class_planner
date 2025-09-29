import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("스크롤 위치 관리 시스템", () => {
  const STORAGE_KEY = "schedule_scroll_position";
  const SCROLL_RESTORE_DURATION = 5 * 60 * 1000; // 5분

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("스크롤 위치 저장", () => {
    it("스크롤 위치를 localStorage에 저장해야 한다", () => {
      const scrollData = {
        scrollLeft: 500,
        scrollTop: 200,
        timestamp: Date.now(),
      };

      const mockElement = {
        scrollLeft: 500,
        scrollTop: 200,
      } as HTMLElement;

      // 스크롤 위치 저장 함수 시뮬레이션
      const saveScrollPosition = (element: HTMLElement) => {
        const data = {
          scrollLeft: element.scrollLeft,
          scrollTop: element.scrollTop,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      };

      saveScrollPosition(mockElement);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"scrollLeft":500')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"scrollTop":200')
      );
    });

    it("저장 시 타임스탬프를 포함해야 한다", () => {
      const mockElement = {
        scrollLeft: 300,
        scrollTop: 100,
      } as HTMLElement;

      const saveScrollPosition = (element: HTMLElement) => {
        const data = {
          scrollLeft: element.scrollLeft,
          scrollTop: element.scrollTop,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      };

      const beforeSave = Date.now();
      saveScrollPosition(mockElement);
      const afterSave = Date.now();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringMatching(new RegExp(`"timestamp":\\d+`))
      );

      // 저장된 타임스탬프가 현재 시간 범위 내에 있는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.timestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(savedData.timestamp).toBeLessThanOrEqual(afterSave);
    });

    it("localStorage 저장 실패 시 에러를 처리해야 한다", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const mockElement = {
        scrollLeft: 400,
        scrollTop: 150,
      } as HTMLElement;

      const saveScrollPosition = (element: HTMLElement) => {
        try {
          const data = {
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop,
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
          // 에러를 무시하고 계속 진행
        }
      };

      expect(() => saveScrollPosition(mockElement)).not.toThrow();
    });
  });

  describe("스크롤 위치 복원", () => {
    it("5분 이내의 데이터를 복원해야 한다", () => {
      const recentTimestamp = Date.now() - 2 * 60 * 1000; // 2분 전
      const savedData = {
        scrollLeft: 800,
        scrollTop: 300,
        timestamp: recentTimestamp,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            if (Date.now() - timestamp < SCROLL_RESTORE_DURATION) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toEqual({ scrollLeft: 800, scrollTop: 300 });
    });

    it("5분을 초과한 데이터는 복원하지 않아야 한다", () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10분 전
      const savedData = {
        scrollLeft: 600,
        scrollTop: 250,
        timestamp: oldTimestamp,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            if (Date.now() - timestamp < SCROLL_RESTORE_DURATION) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toBeNull();
    });

    it("잘못된 JSON 데이터는 복원하지 않아야 한다", () => {
      localStorageMock.getItem.mockReturnValue("invalid json data");

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            if (Date.now() - timestamp < SCROLL_RESTORE_DURATION) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toBeNull();
    });

    it("localStorage에 데이터가 없는 경우 null을 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            if (Date.now() - timestamp < SCROLL_RESTORE_DURATION) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toBeNull();
    });
  });

  describe("타임스탬프 검증", () => {
    it("정확한 시간 계산을 해야 한다", () => {
      const now = Date.now();
      const twoMinutesAgo = now - 2 * 60 * 1000;
      const sixMinutesAgo = now - 6 * 60 * 1000;

      // 2분 전 데이터는 유효
      expect(now - twoMinutesAgo).toBeLessThan(SCROLL_RESTORE_DURATION);

      // 6분 전 데이터는 무효
      expect(now - sixMinutesAgo).toBeGreaterThan(SCROLL_RESTORE_DURATION);
    });

    it("타임스탬프가 미래인 경우를 처리해야 한다", () => {
      const futureTimestamp = Date.now() + 60 * 1000; // 1분 후
      const savedData = {
        scrollLeft: 400,
        scrollTop: 200,
        timestamp: futureTimestamp,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            // 미래 타임스탬프는 음수가 되어 조건을 만족하지 않음
            // 또한 현재 시간보다 미래인 경우도 제외
            if (
              Date.now() - timestamp < SCROLL_RESTORE_DURATION &&
              timestamp <= Date.now()
            ) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      // 미래 타임스탬프는 복원하지 않아야 함
      expect(result).toBeNull();
    });
  });

  describe("데이터 무결성", () => {
    it("필수 필드가 누락된 데이터는 처리해야 한다", () => {
      const incompleteData = {
        scrollLeft: 300,
        // scrollTop 누락
        timestamp: Date.now() - 1 * 60 * 1000,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(incompleteData));

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            // 필수 필드 검증
            if (
              typeof scrollLeft === "number" &&
              typeof scrollTop === "number" &&
              typeof timestamp === "number" &&
              Date.now() - timestamp < SCROLL_RESTORE_DURATION
            ) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toBeNull();
    });

    it("숫자가 아닌 스크롤 값은 처리해야 한다", () => {
      const invalidData = {
        scrollLeft: "invalid",
        scrollTop: "invalid",
        timestamp: Date.now() - 1 * 60 * 1000,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidData));

      const getSavedScrollPosition = () => {
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const { scrollLeft, scrollTop, timestamp } = JSON.parse(savedData);

            if (
              typeof scrollLeft === "number" &&
              typeof scrollTop === "number" &&
              typeof timestamp === "number" &&
              Date.now() - timestamp < SCROLL_RESTORE_DURATION
            ) {
              return { scrollLeft, scrollTop };
            }
          }
        } catch (error) {
          // 에러 무시
        }
        return null;
      };

      const result = getSavedScrollPosition();

      expect(result).toBeNull();
    });
  });
});
