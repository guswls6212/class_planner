import { describe, expect, it } from "vitest";
import { getGroupStudentDisplayText } from "../SessionBlock.utils";

describe("getGroupStudentDisplayText (max 3 names)", () => {
  it("빈 배열이면 빈 문자열을 반환한다", () => {
    expect(getGroupStudentDisplayText([])).toBe("");
  });

  it("1~3명은 그대로 표시한다", () => {
    expect(getGroupStudentDisplayText(["A"])).toBe("A");
    expect(getGroupStudentDisplayText(["A", "B"])).toBe("A, B");
    expect(getGroupStudentDisplayText(["A", "B", "C"])).toBe("A, B, C");
  });

  it("4명 이상은 첫 3명 + 외 N명 형식으로 표시한다", () => {
    expect(getGroupStudentDisplayText(["A", "B", "C", "D"])).toBe(
      "A, B, C 외 1명"
    );
    expect(getGroupStudentDisplayText(["A", "B", "C", "D", "E"])).toBe(
      "A, B, C 외 2명"
    );
    expect(getGroupStudentDisplayText(["A", "B", "C", "D", "E", "F"])).toBe(
      "A, B, C 외 3명"
    );
  });
});
