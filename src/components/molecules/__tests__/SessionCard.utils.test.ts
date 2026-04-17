import { describe, expect, it } from "vitest";
import { resolveSessionTone, isNamedTone } from "../SessionCard.utils";

describe("isNamedTone", () => {
  it("팔레트 색상은 true", () => {
    expect(isNamedTone("blue")).toBe(true);
    expect(isNamedTone("emerald")).toBe(true);
    expect(isNamedTone("orange")).toBe(true);
  });
  it("hex/알 수 없는 값은 false", () => {
    expect(isNamedTone("#3B82F6")).toBe(false);
    expect(isNamedTone("magenta")).toBe(false);
    expect(isNamedTone("")).toBe(false);
  });
});

describe("resolveSessionTone", () => {
  it("undefined면 중립 토큰 반환", () => {
    expect(resolveSessionTone(undefined)).toEqual({
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    });
  });

  it("named tone은 CSS 변수로 매핑", () => {
    expect(resolveSessionTone("blue")).toEqual({
      bg: "var(--color-subject-blue-bg)",
      fg: "var(--color-subject-blue-fg)",
      accent: "var(--color-subject-blue-accent)",
    });
    expect(resolveSessionTone("emerald")).toEqual({
      bg: "var(--color-subject-emerald-bg)",
      fg: "var(--color-subject-emerald-fg)",
      accent: "var(--color-subject-emerald-accent)",
    });
  });

  it("raw hex면 tintFromHex로 bg 생성, fg/accent는 원본", () => {
    const tone = resolveSessionTone("#3B82F6");
    expect(tone.bg).toBe("#d8e6fd");
    expect(tone.fg).toBe("#3B82F6");
    expect(tone.accent).toBe("#3B82F6");
  });

  it("빈 문자열은 중립 토큰으로 처리", () => {
    expect(resolveSessionTone("")).toEqual({
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    });
  });
});
