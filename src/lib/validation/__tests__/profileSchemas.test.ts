import { describe, expect, it } from "vitest";

import {
  ACADEMY_NAME_MAX_LENGTH,
  GENDER_LABEL,
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  NAME_MAX_LENGTH,
  SCHOOL_MAX_LENGTH,
  SUBJECT_NAME_MAX_LENGTH,
  formatKoreanPhone,
  getStudentBirthDateRange,
  getTeacherBirthDateRange,
  isBirthDateInRange,
  isValidGender,
  isValidGrade,
  isValidKoreanPhone,
  validateAcademyName,
  validatePhoneNumber,
  validateStudentBirthDate,
  validateStudentGender,
  validateStudentGrade,
  validateStudentName,
  validateStudentSchool,
  validateSubjectName,
  validateTeacherName,
} from "../profileSchemas";

describe("profileSchemas", () => {
  it("상수값 sanity", () => {
    expect(NAME_MAX_LENGTH).toBe(6);
    expect(SCHOOL_MAX_LENGTH).toBe(30);
    expect(SUBJECT_NAME_MAX_LENGTH).toBe(12);
    expect(ACADEMY_NAME_MAX_LENGTH).toBe(30);
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

  describe("validateStudentName", () => {
    it("빈/공백 입력 → STUDENT_NAME_REQUIRED", () => {
      expect(validateStudentName("")).toEqual({ ok: false, code: "STUDENT_NAME_REQUIRED" });
      expect(validateStudentName("   ")).toEqual({ ok: false, code: "STUDENT_NAME_REQUIRED" });
    });
    it("1글자 → STUDENT_NAME_TOO_SHORT (NAME_MIN_LENGTH=2)", () => {
      expect(validateStudentName("일")).toEqual({
        ok: false,
        code: "STUDENT_NAME_TOO_SHORT",
      });
      expect(validateStudentName("  일  ")).toEqual({
        ok: false,
        code: "STUDENT_NAME_TOO_SHORT",
      });
    });
    it("길이 초과 → STUDENT_NAME_TOO_LONG", () => {
      expect(validateStudentName("일이삼사오육칠")).toEqual({
        ok: false,
        code: "STUDENT_NAME_TOO_LONG",
      });
    });
    it("정상 → ok + trim된 value", () => {
      expect(validateStudentName("이주연")).toEqual({ ok: true, value: "이주연" });
      expect(validateStudentName("  이주연  ")).toEqual({ ok: true, value: "이주연" });
      expect(validateStudentName("일이삼사오육")).toEqual({ ok: true, value: "일이삼사오육" });
    });
  });

  describe("validateTeacherName", () => {
    it("빈 입력 → TEACHER_NAME_REQUIRED", () => {
      expect(validateTeacherName("")).toEqual({ ok: false, code: "TEACHER_NAME_REQUIRED" });
    });
    it("1글자 → TEACHER_NAME_TOO_SHORT", () => {
      expect(validateTeacherName("김")).toEqual({
        ok: false,
        code: "TEACHER_NAME_TOO_SHORT",
      });
    });
    it("길이 초과 → TEACHER_NAME_TOO_LONG", () => {
      expect(validateTeacherName("일이삼사오육칠")).toEqual({
        ok: false,
        code: "TEACHER_NAME_TOO_LONG",
      });
    });
    it("정상 → ok", () => {
      expect(validateTeacherName("김선생")).toEqual({ ok: true, value: "김선생" });
    });
  });

  describe("validateSubjectName", () => {
    it("빈 입력 → SUBJECT_NAME_REQUIRED", () => {
      expect(validateSubjectName("")).toEqual({ ok: false, code: "SUBJECT_NAME_REQUIRED" });
    });
    it("1글자 → SUBJECT_NAME_TOO_SHORT", () => {
      expect(validateSubjectName("국")).toEqual({
        ok: false,
        code: "SUBJECT_NAME_TOO_SHORT",
      });
    });
    it("12자 초과 → SUBJECT_NAME_TOO_LONG", () => {
      expect(validateSubjectName("일이삼사오육칠팔구십일이삼")).toEqual({
        ok: false,
        code: "SUBJECT_NAME_TOO_LONG",
      });
    });
    it("12자 이하 정상 → ok", () => {
      expect(validateSubjectName("고3 수학 심화반")).toEqual({
        ok: true,
        value: "고3 수학 심화반",
      });
      expect(validateSubjectName("일이삼사오육칠팔구십일이")).toEqual({
        ok: true,
        value: "일이삼사오육칠팔구십일이",
      });
    });
  });

  describe("validateAcademyName", () => {
    it("빈 입력 → ACADEMY_NAME_REQUIRED", () => {
      expect(validateAcademyName("")).toEqual({ ok: false, code: "ACADEMY_NAME_REQUIRED" });
    });
    it("30자 초과 → ACADEMY_NAME_TOO_LONG", () => {
      expect(validateAcademyName("일".repeat(31))).toEqual({
        ok: false,
        code: "ACADEMY_NAME_TOO_LONG",
      });
    });
    it("30자 이하 정상 → ok", () => {
      expect(validateAcademyName("○○어학원 강남캠퍼스")).toEqual({
        ok: true,
        value: "○○어학원 강남캠퍼스",
      });
    });
  });

  describe("validateStudentSchool", () => {
    it("빈 값 → ok (권장 필드)", () => {
      expect(validateStudentSchool("")).toEqual({ ok: true });
      expect(validateStudentSchool("   ")).toEqual({ ok: true });
    });
    it("길이 초과 → STUDENT_SCHOOL_TOO_LONG", () => {
      expect(validateStudentSchool("가".repeat(31))).toEqual({
        ok: false,
        code: "STUDENT_SCHOOL_TOO_LONG",
      });
    });
    it("정상 → ok", () => {
      expect(validateStudentSchool("○○고등학교")).toEqual({ ok: true });
    });
  });

  describe("validateStudentGrade", () => {
    it("빈 값 → ok (권장 필드)", () => {
      expect(validateStudentGrade("")).toEqual({ ok: true });
    });
    it("화이트리스트 위반 → STUDENT_GRADE_INVALID", () => {
      expect(validateStudentGrade("대1")).toEqual({
        ok: false,
        code: "STUDENT_GRADE_INVALID",
      });
    });
    it("정상 → ok", () => {
      expect(validateStudentGrade("초3")).toEqual({ ok: true });
      expect(validateStudentGrade("재수")).toEqual({ ok: true });
    });
  });

  describe("validateStudentGender", () => {
    it("빈 값 → ok (권장 필드)", () => {
      expect(validateStudentGender("")).toEqual({ ok: true });
    });
    it("화이트리스트 위반 → STUDENT_GENDER_INVALID", () => {
      expect(validateStudentGender("남")).toEqual({
        ok: false,
        code: "STUDENT_GENDER_INVALID",
      });
      expect(validateStudentGender("남ㅇㅇㅇ")).toEqual({
        ok: false,
        code: "STUDENT_GENDER_INVALID",
      });
    });
    it("male/female만 통과", () => {
      expect(validateStudentGender("male")).toEqual({ ok: true });
      expect(validateStudentGender("female")).toEqual({ ok: true });
    });
  });

  describe("validatePhoneNumber", () => {
    it("빈 값 → ok (권장 필드)", () => {
      expect(validatePhoneNumber("")).toEqual({ ok: true });
    });
    it("자릿수 부족 → PHONE_INVALID_FORMAT", () => {
      expect(validatePhoneNumber("010-12-345")).toEqual({
        ok: false,
        code: "PHONE_INVALID_FORMAT",
      });
      expect(validatePhoneNumber("02-12-34")).toEqual({
        ok: false,
        code: "PHONE_INVALID_FORMAT",
      });
    });
    it("digit이 없는 입력은 빈 값으로 취급 → ok (isValidKoreanPhone 정책)", () => {
      expect(validatePhoneNumber("abc")).toEqual({ ok: true });
    });
    it("정상 → ok", () => {
      expect(validatePhoneNumber("010-1234-5678")).toEqual({ ok: true });
      expect(validatePhoneNumber("02-123-4567")).toEqual({ ok: true });
    });
  });

  describe("validateStudentBirthDate", () => {
    const today = new Date(2026, 4, 9);
    it("빈 값 → ok (권장 필드)", () => {
      expect(validateStudentBirthDate("", today)).toEqual({ ok: true });
    });
    it("범위 외 → STUDENT_BIRTHDATE_OUT_OF_RANGE", () => {
      expect(validateStudentBirthDate("2222-03-31", today)).toEqual({
        ok: false,
        code: "STUDENT_BIRTHDATE_OUT_OF_RANGE",
      });
      expect(validateStudentBirthDate("2000-12-31", today)).toEqual({
        ok: false,
        code: "STUDENT_BIRTHDATE_OUT_OF_RANGE",
      });
    });
    it("범위 내 → ok", () => {
      expect(validateStudentBirthDate("2010-06-15", today)).toEqual({ ok: true });
    });
  });
});
