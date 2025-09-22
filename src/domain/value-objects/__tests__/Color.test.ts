import { describe, expect, it } from "vitest";
import { Color } from "../Color";

describe("Color Value Object", () => {
  it("유효한 HEX 색상으로 Color를 생성해야 한다", () => {
    const validHex = "#FF0000";
    const color = Color.fromString(validHex);

    expect(color.value).toBe(validHex);
  });

  it("소문자 HEX 색상으로 Color를 생성해야 한다", () => {
    const validHex = "#ff0000";
    const color = Color.fromString(validHex);

    expect(color.value).toBe(validHex);
  });

  it("3자리 HEX 색상으로 Color를 생성해야 한다", () => {
    const validHex = "#F00";
    const color = Color.fromString(validHex);

    expect(color.value).toBe(validHex);
  });

  it("유효하지 않은 HEX 색상으로 Color 생성 시 에러를 던져야 한다", () => {
    const invalidHex = "invalid-color";

    expect(() => Color.fromString(invalidHex)).toThrow(
      "Color must be a valid HEX color (e.g., #ff0000)"
    );
  });

  it("빈 문자열로 Color 생성 시 에러를 던져야 한다", () => {
    expect(() => Color.fromString("")).toThrow("Color cannot be empty");
  });

  it("# 없이 HEX 색상으로 Color 생성 시 에러를 던져야 한다", () => {
    expect(() => Color.fromString("FF0000")).toThrow(
      "Color must be a valid HEX color (e.g., #ff0000)"
    );
  });

  it("팔레트 색상으로 Color를 생성해야 한다", () => {
    const color = Color.fromPalette("red");

    expect(color.value).toBe("#ef4444");
  });

  it("동일한 값의 Color는 같아야 한다", () => {
    const hex = "#FF0000";
    const color1 = Color.fromString(hex);
    const color2 = Color.fromString(hex);

    expect(color1.equals(color2)).toBe(true);
  });

  it("다른 값의 Color는 달라야 한다", () => {
    const color1 = Color.fromString("#FF0000");
    const color2 = Color.fromString("#00FF00");

    expect(color1.equals(color2)).toBe(false);
  });

  it("toString 메서드가 올바른 값을 반환해야 한다", () => {
    const hex = "#FF0000";
    const color = Color.fromString(hex);

    expect(color.toString()).toBe(hex);
  });

  it("존재하지 않는 팔레트 색상으로 Color 생성 시 에러를 던져야 한다", () => {
    expect(() => Color.fromPalette("nonexistent")).toThrow(
      "Unknown color: nonexistent"
    );
  });
});
