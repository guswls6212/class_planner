import { describe, expect, it } from "vitest";
import {
  getKSTTime,
  getKSTDate,
  getKSTTimestampForDB,
  toKSTString,
  parseKSTTime,
  formatKSTDate,
  getKSTTimestamp,
  getTimeZoneInfo,
  validateTimeSettings,
} from "../timeUtils";

describe("timeUtils", () => {
  describe("getKSTTime", () => {
    it("KST 오프셋 +09:00을 포함한 ISO 문자열을 반환한다", () => {
      const result = getKSTTime();
      expect(result).toContain("+09:00");
      expect(result).not.toContain("Z");
    });
  });

  describe("getKSTDate", () => {
    it("Date 객체를 반환한다", () => {
      const result = getKSTDate();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("getKSTTimestampForDB", () => {
    it("PostgreSQL 호환 형식 +09:00을 포함한다", () => {
      const result = getKSTTimestampForDB();
      expect(result).toContain("+09:00");
    });
  });

  describe("toKSTString", () => {
    it("Date를 +09:00 KST 문자열로 변환한다", () => {
      const date = new Date("2026-01-15T00:00:00Z");
      const result = toKSTString(date);
      expect(result).toContain("+09:00");
    });
  });

  describe("parseKSTTime", () => {
    it("+09:00 문자열은 그대로 파싱한다", () => {
      const input = "2026-01-15T09:00:00+09:00";
      const result = parseKSTTime(input);
      expect(result).toBeInstanceOf(Date);
    });

    it("UTC 문자열은 KST로 변환한다", () => {
      const utcStr = "2026-01-15T00:00:00Z";
      const result = parseKSTTime(utcStr);
      const utcDate = new Date(utcStr);
      expect(result.getTime()).toBeGreaterThan(utcDate.getTime());
    });
  });

  describe("formatKSTDate", () => {
    it("한국어 로케일로 포맷된 문자열을 반환한다", () => {
      const date = new Date("2026-06-15T12:30:00Z");
      const result = formatKSTDate(date);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("커스텀 옵션을 적용할 수 있다", () => {
      const date = new Date("2026-06-15T12:30:00Z");
      const result = formatKSTDate(date, { year: "numeric", month: "long" });
      expect(result).toContain("2026");
    });
  });

  describe("getKSTTimestamp", () => {
    it("숫자를 반환한다", () => {
      const result = getKSTTimestamp();
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("getTimeZoneInfo", () => {
    it("utc, kst, local, timezone, offset 필드를 포함한다", () => {
      const info = getTimeZoneInfo();
      expect(info.utc).toBeDefined();
      expect(info.kst).toContain("+09:00");
      expect(info.timezone).toBe("Asia/Seoul");
      expect(info.offset).toBe("UTC+9");
    });
  });

  describe("validateTimeSettings", () => {
    it("boolean을 반환한다", () => {
      const result = validateTimeSettings();
      expect(typeof result).toBe("boolean");
    });
  });
});
