import { describe, it, expect } from "vitest";
import {
  buildDuplicateNameSet,
  formatStudentDuplicateLabel,
  formatTeacherDuplicateLabel,
} from "../duplicateLabel";

describe("buildDuplicateNameSet", () => {
  it("같은 이름이 2명 이상이면 set에 포함", () => {
    const items = [
      { name: "홍길동" },
      { name: "이순신" },
      { name: "홍길동" },
      { name: "강감찬" },
    ];
    const set = buildDuplicateNameSet(items);
    expect(set.has("홍길동")).toBe(true);
    expect(set.has("이순신")).toBe(false);
    expect(set.has("강감찬")).toBe(false);
    expect(set.size).toBe(1);
  });

  it("빈 배열은 빈 set", () => {
    expect(buildDuplicateNameSet([]).size).toBe(0);
  });
});

describe("formatStudentDuplicateLabel", () => {
  const dupSet = new Set(["이현진"]);

  it("동명이인 + 성별/생년월일 있으면 식별 정보 반환", () => {
    const s = { name: "이현진", gender: "male", birthDate: "2005-08-07" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("남 · 2005-08-07");
  });

  it("동명이인 + 여성", () => {
    const s = { name: "이현진", gender: "female", birthDate: "2005-08-07" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("여 · 2005-08-07");
  });

  it("동명이인이지만 식별 정보 없으면 학년/학교 fallback", () => {
    const s = { name: "이현진", grade: "고3", school: "한빛고" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("고3 · 한빛고");
  });

  it("동명이인 + 식별/학년/학교 모두 없으면 '프로필 미입력 · 동명이인'", () => {
    const s = { name: "이현진" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("프로필 미입력 · 동명이인");
  });

  it("동명이인 아니면 학년/학교 표시", () => {
    const s = { name: "강감찬", grade: "고1" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("고1");
  });

  it("동명이인 아니고 메타도 없으면 '프로필 미입력'", () => {
    const s = { name: "강감찬" };
    expect(formatStudentDuplicateLabel(s, dupSet)).toBe("프로필 미입력");
  });
});

describe("formatTeacherDuplicateLabel", () => {
  const dupSet = new Set(["김민철"]);

  it("동명이인 + 이메일/전화 있으면 식별 정보 반환", () => {
    const t = { name: "김민철", email: "a@b.com", phone: "010-1234-5678" };
    expect(formatTeacherDuplicateLabel(t, dupSet)).toBe("a@b.com · 010-1234-5678");
  });

  it("동명이인 + 이메일만 있으면 이메일만", () => {
    const t = { name: "김민철", email: "a@b.com" };
    expect(formatTeacherDuplicateLabel(t, dupSet)).toBe("a@b.com");
  });

  it("동명이인이지만 식별 정보 없으면 빈 문자열 (호출부 fallback 사용)", () => {
    const t = { name: "김민철" };
    expect(formatTeacherDuplicateLabel(t, dupSet)).toBe("");
  });

  it("동명이인 아니면 빈 문자열", () => {
    const t = { name: "김학성", email: "x@y.com" };
    expect(formatTeacherDuplicateLabel(t, dupSet)).toBe("");
  });
});
