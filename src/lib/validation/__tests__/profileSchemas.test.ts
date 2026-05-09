import { describe, expect, it } from "vitest";

import {
  GENDER_LABEL,
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  NAME_MAX_LENGTH,
  SCHOOL_MAX_LENGTH,
  formatKoreanPhone,
  getStudentBirthDateRange,
  getTeacherBirthDateRange,
  isBirthDateInRange,
  isValidGender,
  isValidGrade,
  isValidKoreanPhone,
} from "../profileSchemas";

describe("profileSchemas", () => {
  it("상수값 sanity", () => {
    expect(NAME_MAX_LENGTH).toBe(6);
    expect(SCHOOL_MAX_LENGTH).toBe(30);
    expect(GRADE_OPTIONS).toHaveLength(15);
    expect(GENDER_OPTIONS).toEqual(["male", "female"]);
    expect(GENDER_LABEL).toEqual({ male: "남", female: "여" });
  });

  describe("isValidGrade", () => {
    it("유효 학년 true", () => {
      expect(isValidGrade("초1")).toBe(true);
      expect(isValidGrade("중3")).toBe(true);
      expect(isValidGrade("고3")).toBe(true);
      expect(isValidGrade("미취학")).toBe(true);
      expect(isValidGrade("재수")).toBe(true);
      expect(isValidGrade("기타")).toBe(true);
    });
    it("무효값 false", () => {
      expect(isValidGrade("")).toBe(false);
      expect(isValidGrade("초0")).toBe(false);
      expect(isValidGrade("대1")).toBe(false);
      expect(isValidGrade("초ㅇ")).toBe(false);
    });
  });

  describe("isValidGender", () => {
    it("male/female만 true", () => {
      expect(isValidGender("male")).toBe(true);
      expect(isValidGender("female")).toBe(true);
      expect(isValidGender("")).toBe(false);
      expect(isValidGender("남")).toBe(false);
      expect(isValidGender("남ㅇㅇㅇ")).toBe(false);
    });
  });

  describe("formatKoreanPhone", () => {
    it("빈 입력 → 빈 문자열", () => {
      expect(formatKoreanPhone("")).toBe("");
      expect(formatKoreanPhone("abc")).toBe("");
    });
    it("010 휴대폰: 3-4-4 단계적 하이픈", () => {
      expect(formatKoreanPhone("010")).toBe("010");
      expect(formatKoreanPhone("0101")).toBe("010-1");
      expect(formatKoreanPhone("01012345")).toBe("010-1234-5");
      expect(formatKoreanPhone("01012345678")).toBe("010-1234-5678");
    });
    it("02 서울: 2-3-4 또는 2-4-4", () => {
      expect(formatKoreanPhone("02")).toBe("02");
      expect(formatKoreanPhone("021234")).toBe("02-123-4");
      expect(formatKoreanPhone("021234567")).toBe("02-123-4567");
      expect(formatKoreanPhone("0212345678")).toBe("02-1234-5678");
    });
    it("031 지역: 3-4-4", () => {
      expect(formatKoreanPhone("0311234567")).toBe("031-1234-567");
      expect(formatKoreanPhone("03112345678")).toBe("031-1234-5678");
    });
    it("11자리 초과는 잘림", () => {
      expect(formatKoreanPhone("0101234567890")).toBe("010-1234-5678");
    });
    it("이미 포맷된 입력 재포맷", () => {
      expect(formatKoreanPhone("010-1234-5678")).toBe("010-1234-5678");
    });
  });

  describe("isValidKoreanPhone", () => {
    it("빈 값은 권장 필드라 통과", () => {
      expect(isValidKoreanPhone("")).toBe(true);
    });
    it("유효 010 휴대폰", () => {
      expect(isValidKoreanPhone("010-1234-5678")).toBe(true);
      expect(isValidKoreanPhone("01012345678")).toBe(true);
    });
    it("유효 02 서울", () => {
      expect(isValidKoreanPhone("02-123-4567")).toBe(true);
      expect(isValidKoreanPhone("02-1234-5678")).toBe(true);
    });
    it("유효 지역 (031, 051)", () => {
      expect(isValidKoreanPhone("031-1234-5678")).toBe(true);
      expect(isValidKoreanPhone("051-123-4567")).toBe(true);
    });
    it("자릿수 부족 false", () => {
      expect(isValidKoreanPhone("010-12-345")).toBe(false);
      expect(isValidKoreanPhone("02-12-34")).toBe(false);
    });
    it("앞자리 0 없으면 false", () => {
      expect(isValidKoreanPhone("123-4567-8901")).toBe(false);
    });
  });

  describe("getStudentBirthDateRange", () => {
    it("오늘 기준 만 4~25세 범위 (오늘=2026-05-09)", () => {
      const today = new Date(2026, 4, 9);
      const range = getStudentBirthDateRange(today);
      expect(range.max).toBe("2022-05-09");
      expect(range.min).toBe("2001-05-09");
    });
  });

  describe("getTeacherBirthDateRange", () => {
    it("오늘 기준 만 18~80세 범위", () => {
      const today = new Date(2026, 4, 9);
      const range = getTeacherBirthDateRange(today);
      expect(range.max).toBe("2008-05-09");
      expect(range.min).toBe("1946-05-09");
    });
  });

  describe("isBirthDateInRange", () => {
    const range = { min: "2001-05-09", max: "2022-05-09" };
    it("빈 값 통과", () => {
      expect(isBirthDateInRange("", range)).toBe(true);
    });
    it("범위 내 true", () => {
      expect(isBirthDateInRange("2010-06-15", range)).toBe(true);
      expect(isBirthDateInRange("2001-05-09", range)).toBe(true);
      expect(isBirthDateInRange("2022-05-09", range)).toBe(true);
    });
    it("범위 외 false", () => {
      expect(isBirthDateInRange("2000-12-31", range)).toBe(false);
      expect(isBirthDateInRange("2023-01-01", range)).toBe(false);
      expect(isBirthDateInRange("2222-03-31", range)).toBe(false);
    });
  });
});
