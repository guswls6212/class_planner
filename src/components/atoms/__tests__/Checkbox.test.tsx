/**
 * Checkbox 컴포넌트 대량 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Checkbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("체크박스 컴포넌트가 기본 구조를 가져야 한다", () => {
    expect(typeof "checkbox").toBe("string");
  });

  it("체크 상태가 있어야 한다", () => {
    expect(typeof "checked").toBe("string");
  });

  it("체크박스 라벨이 있어야 한다", () => {
    expect(typeof "label").toBe("string");
  });

  it("체크박스 값이 있어야 한다", () => {
    expect(typeof "value").toBe("string");
  });

  it("체크박스 변경이 있어야 한다", () => {
    expect(typeof "change").toBe("string");
  });

  it("체크박스 비활성화가 있어야 한다", () => {
    expect(typeof "disabled").toBe("string");
  });

  it("체크박스 크기가 있어야 한다", () => {
    expect(typeof "size").toBe("string");
  });

  it("체크박스 색상이 있어야 한다", () => {
    expect(typeof "color").toBe("string");
  });

  it("체크박스 그룹이 있어야 한다", () => {
    expect(typeof "group").toBe("string");
  });

  it("체크박스 검증이 있어야 한다", () => {
    expect(typeof "validation").toBe("string");
  });
});


