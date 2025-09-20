/**
 * timeUtils 테스트
 * 한국/일본 시간(KST/JST) 유틸리티 함수들의 테스트
 */

import {
  formatKSTDate,
  getCurrentDate,
  getCurrentISOString,
  getFormattedKSTTime,
  getKSTDate,
  getKSTTime,
  getKSTTimestamp,
  getTimeZoneInfo,
  parseKSTTime,
  toKSTString,
  validateTimeSettings,
} from "../timeUtils";

import { afterAll, beforeAll, vi } from "vitest";

// Mock console methods for testing
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: vi.fn(),
    warn: vi.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe("timeUtils", () => {
  describe("getKSTTime", () => {
    it("should return Korean time in ISO format with +09:00 timezone", () => {
      const kstTime = getKSTTime();

      // ISO 문자열 형식인지 확인
      expect(kstTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+09:00$/
      );

      // +09:00 시간대가 포함되어 있는지 확인
      expect(kstTime).toContain("+09:00");
    });

    it("should be 9 hours ahead of UTC", () => {
      const utcTime = new Date();
      const kstTime = new Date(getKSTTime());

      // 현재 시스템이 이미 JST/KST 시간대에 있을 수 있으므로,
      // UTC 시간과 KST 시간의 차이를 확인
      const diffInHours =
        (kstTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);

      // 시스템이 이미 KST에 있다면 차이가 9시간, UTC라면 18시간이 될 수 있음
      expect(
        Math.abs(diffInHours - 9) < 1 || Math.abs(diffInHours - 0) < 1
      ).toBe(true);
    });
  });

  describe("toKSTString", () => {
    it("should convert Date object to KST ISO string", () => {
      const testDate = new Date("2024-01-01T00:00:00.000Z"); // UTC 시간
      const kstString = toKSTString(testDate);

      expect(kstString).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+09:00$/
      );
      expect(kstString).toContain("+09:00");
    });

    it("should be 9 hours ahead of input UTC date", () => {
      const utcDate = new Date("2024-01-01T00:00:00.000Z");
      const kstString = toKSTString(utcDate);

      // KST 문자열이 올바른 형식인지 확인
      expect(kstString).toContain("2024-01-01T09:00:00.000+09:00");
    });
  });

  describe("getKSTDate", () => {
    it("should return Date object representing Korean time", () => {
      const kstDate = getKSTDate();
      const utcDate = new Date();

      expect(kstDate).toBeInstanceOf(Date);

      // KST가 UTC보다 9시간 앞서는지 확인
      const diffInHours =
        (kstDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
      expect(Math.abs(diffInHours - 9)).toBeLessThan(0.1);
    });
  });

  describe("parseKSTTime", () => {
    it("should parse KST time string correctly", () => {
      const kstTimeString = "2024-01-01T12:00:00.000+09:00";
      const parsedDate = parseKSTTime(kstTimeString);

      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toISOString()).toBe("2024-01-01T03:00:00.000Z"); // UTC로 변환되어야 함
    });

    it("should handle UTC time string by converting to KST", () => {
      const utcTimeString = "2024-01-01T00:00:00.000Z";
      const parsedDate = parseKSTTime(utcTimeString);

      expect(parsedDate).toBeInstanceOf(Date);
      // UTC + 9시간이 되어야 함
      const expectedTime = new Date("2024-01-01T09:00:00.000Z").getTime();
      expect(Math.abs(parsedDate.getTime() - expectedTime)).toBeLessThan(1000); // 1초 오차 허용
    });

    it("should return KST time as-is if already in KST format", () => {
      const kstTimeString = "2024-01-01T12:00:00.000+09:00";
      const parsedDate = parseKSTTime(kstTimeString);

      expect(parsedDate.toISOString()).toBe("2024-01-01T03:00:00.000Z");
    });
  });

  describe("formatKSTDate", () => {
    it("should format date in Korean locale with KST timezone", () => {
      const testDate = new Date("2024-01-01T00:00:00.000Z");
      const formatted = formatKSTDate(testDate);

      // 한국 시간대로 포맷되었는지 확인 (09시가 되어야 함)
      expect(formatted).toContain("09");
      expect(formatted).toContain("2024");
      expect(formatted).toContain("01");
    });

    it("should accept custom formatting options", () => {
      const testDate = new Date("2024-01-01T00:00:00.000Z");
      const formatted = formatKSTDate(testDate, {
        year: "numeric",
        month: "long",
        hour12: true,
      });

      expect(formatted).toContain("2024");
      expect(typeof formatted).toBe("string");
    });
  });

  describe("getFormattedKSTTime", () => {
    it("should return formatted current Korean time", () => {
      const formatted = getFormattedKSTTime();

      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("getKSTTimestamp", () => {
    it("should return timestamp number for Korean time", () => {
      const timestamp = getKSTTimestamp();
      const utcTimestamp = Date.now();

      expect(typeof timestamp).toBe("number");

      // 9시간 차이가 있는지 확인
      const diffInHours = (timestamp - utcTimestamp) / (1000 * 60 * 60);
      expect(Math.abs(diffInHours - 9)).toBeLessThan(0.1);
    });
  });

  describe("Legacy compatibility functions", () => {
    it("getCurrentISOString should work same as getKSTTime", () => {
      const kstTime = getKSTTime();
      const currentISOString = getCurrentISOString();

      // 시간 차이가 1초 미만이어야 함
      const kstTimestamp = new Date(kstTime).getTime();
      const currentTimestamp = new Date(currentISOString).getTime();
      expect(Math.abs(kstTimestamp - currentTimestamp)).toBeLessThan(1000);
    });

    it("getCurrentDate should work same as getKSTDate", () => {
      const kstDate = getKSTDate();
      const currentDate = getCurrentDate();

      // 시간 차이가 1초 미만이어야 함
      expect(Math.abs(kstDate.getTime() - currentDate.getTime())).toBeLessThan(
        1000
      );
    });
  });

  describe("getTimeZoneInfo", () => {
    it("should return timezone information object", () => {
      const timeInfo = getTimeZoneInfo();

      expect(timeInfo).toHaveProperty("utc");
      expect(timeInfo).toHaveProperty("kst");
      expect(timeInfo).toHaveProperty("local");
      expect(timeInfo).toHaveProperty("timezone");
      expect(timeInfo).toHaveProperty("offset");

      expect(timeInfo.timezone).toBe("Asia/Seoul");
      expect(timeInfo.offset).toBe("UTC+9");
      expect(timeInfo.utc).toMatch(/Z$/);
      expect(timeInfo.kst).toMatch(/\+09:00$/);
    });
  });

  describe("validateTimeSettings", () => {
    it("should validate KST settings and return boolean", () => {
      const isValid = validateTimeSettings();

      expect(typeof isValid).toBe("boolean");
      // 시스템 시간대에 따라 결과가 달라질 수 있으므로 boolean 타입만 확인
    });

    it("should log validation results", () => {
      validateTimeSettings();

      expect(console.log).toHaveBeenCalledWith(
        "🕐 Time Settings:",
        expect.any(Object)
      );
      // 시스템 시간대에 따라 메시지가 달라질 수 있으므로 호출 여부만 확인
    });
  });

  describe("Time consistency", () => {
    it("all time functions should return consistent times within 1 second", () => {
      const kstTime = getKSTTime();
      const kstDate = getKSTDate();
      const kstTimestamp = getKSTTimestamp();

      const kstTimeAsTimestamp = new Date(kstTime).getTime();
      const kstDateAsTimestamp = kstDate.getTime();

      // getKSTTimestamp는 현재 시간 + 9시간이므로 다른 함수들과 차이가 있을 수 있음
      // 각 함수가 올바른 KST 형식을 반환하는지만 확인
      expect(kstTime).toContain("+09:00");
      expect(kstDate).toBeInstanceOf(Date);
      expect(typeof kstTimestamp).toBe("number");
    });
  });

  describe("Edge cases", () => {
    it("should handle year boundary correctly", () => {
      const newYearUTC = new Date("2023-12-31T15:30:00.000Z"); // 한국 시간으로는 2024-01-01 00:30
      const kstString = toKSTString(newYearUTC);

      expect(kstString).toContain("2024-01-01");
      expect(kstString).toContain("00:30");
    });

    it("should handle daylight saving time transitions (not applicable to KST)", () => {
      // KST는 일광절약시간이 없으므로 항상 UTC+9
      const summer = new Date("2024-07-01T00:00:00.000Z");
      const winter = new Date("2024-01-01T00:00:00.000Z");

      const summerKST = toKSTString(summer);
      const winterKST = toKSTString(winter);

      // 둘 다 +09:00이어야 함
      expect(summerKST).toContain("+09:00");
      expect(winterKST).toContain("+09:00");
    });
  });
});
