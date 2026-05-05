import { describe, it, expect } from "vitest";
import {
  TEACHER_PALETTE,
  SUBJECT_PALETTE,
  getNextUnusedColor,
} from "../getNextUnusedColor";

describe("getNextUnusedColor", () => {
  it("returns first palette color when used is empty", () => {
    expect(getNextUnusedColor(["a", "b", "c"], [])).toBe("a");
  });

  it("returns first unused color when some are used", () => {
    expect(getNextUnusedColor(["a", "b", "c"], ["a"])).toBe("b");
    expect(getNextUnusedColor(["a", "b", "c"], ["a", "c"])).toBe("b");
  });

  it("falls back to modulo when all palette colors are used", () => {
    expect(getNextUnusedColor(["a", "b"], ["a", "b"])).toBe("a"); // 2 % 2 = 0
    expect(getNextUnusedColor(["a", "b"], ["a", "b", "a"])).toBe("b"); // 3 % 2 = 1
  });

  it("throws when palette is empty", () => {
    expect(() => getNextUnusedColor([], [])).toThrow();
  });
});

describe("TEACHER_PALETTE / SUBJECT_PALETTE", () => {
  it("expose non-empty palettes", () => {
    expect(TEACHER_PALETTE.length).toBeGreaterThan(0);
    expect(SUBJECT_PALETTE.length).toBeGreaterThan(0);
  });
});
