// src/lib/errors/__tests__/messages.ko.test.ts
import { describe, expect, it } from "vitest";
import messages, { getKoMessage } from "../messages.ko";
import { ErrorCodes } from "../codes";

describe("messages.ko", () => {
  it("모든 ErrorCode가 messages에 매핑되어 있어야 한다", () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(messages).toHaveProperty(code);
      expect(typeof messages[code]).toBe("string");
      expect(messages[code].length).toBeGreaterThan(0);
    }
  });

  it("getKoMessage: 알려진 코드 — 올바른 메시지 반환", () => {
    expect(getKoMessage("STUDENT_NAME_DUPLICATE")).toBe("이미 존재하는 학생 이름입니다.");
    expect(getKoMessage("INVITE_TOKEN_EXPIRED")).toBe("만료된 초대 링크입니다.");
    expect(getKoMessage("INTERNAL_ERROR")).toBe("서버 오류가 발생했습니다.");
  });

  it("getKoMessage: 미매핑 코드 — fallback 메시지 반환", () => {
    expect(getKoMessage("UNKNOWN_FUTURE_CODE")).toBe("알 수 없는 오류가 발생했습니다.");
    expect(getKoMessage("")).toBe("알 수 없는 오류가 발생했습니다.");
  });
});
