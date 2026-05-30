import { describe, expect, it } from "vitest";
import { tintFromHex } from "../tintFromHex";

describe("tintFromHex", () => {
  it("기본 ratio 0.8로 파스텔 변환 — 파란색", () => {
    // #3B82F6 (blue-500) + 80% white →
    // R: 59 * 0.2 + 255 * 0.8 = 215.8 → 216 (0xD8)
    // G: 130 * 0.2 + 255 * 0.8 = 230   → 230 (0xE6)
    // B: 246 * 0.2 + 255 * 0.8 = 253.2 → 253 (0xFD)
    expect(tintFromHex("#3B82F6")).toBe("#d8e6fd");
  });

  it("ratio 0 이면 원본 반환", () => {
    expect(tintFromHex("#3B82F6", 0)).toBe("#3b82f6");
  });

  it("ratio 1 이면 화이트 반환", () => {
    expect(tintFromHex("#3B82F6", 1)).toBe("#ffffff");
  });

  it("# 없는 입력도 처리", () => {
    expect(tintFromHex("3B82F6")).toBe("#d8e6fd");
  });

  it("대문자/소문자 혼용 입력을 소문자로 정규화하여 반환", () => {
    expect(tintFromHex("#3b82f6")).toBe("#d8e6fd");
    expect(tintFromHex("#3B82F6")).toBe("#d8e6fd");
  });

  it("short hex(#RGB)는 3자리로 받지 않음 — 6자리만 지원", () => {
    expect(() => tintFromHex("#ABC")).toThrow();
  });

  it("빨강/초록 경계", () => {
    expect(tintFromHex("#EF4444")).toBe("#fcdada");
    expect(tintFromHex("#10B981")).toBe("#cff1e6");
  });
});
