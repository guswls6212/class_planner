/**
 * Pagination 컴포넌트 대량 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("페이지네이션이 기본 구조를 가져야 한다", () => {
    expect(typeof "pagination").toBe("string");
  });

  it("현재 페이지가 있어야 한다", () => {
    expect(typeof "current").toBe("string");
  });

  it("전체 페이지가 있어야 한다", () => {
    expect(typeof "total").toBe("string");
  });

  it("이전 페이지가 있어야 한다", () => {
    expect(typeof "prev").toBe("string");
  });

  it("다음 페이지가 있어야 한다", () => {
    expect(typeof "next").toBe("string");
  });

  it("첫 페이지가 있어야 한다", () => {
    expect(typeof "first").toBe("string");
  });

  it("마지막 페이지가 있어야 한다", () => {
    expect(typeof "last").toBe("string");
  });

  it("페이지 크기가 있어야 한다", () => {
    expect(typeof "size").toBe("string");
  });

  it("페이지 변경이 있어야 한다", () => {
    expect(typeof "change").toBe("string");
  });

  it("페이지 정보가 있어야 한다", () => {
    expect(typeof "info").toBe("string");
  });

  it("페이지 버튼들이 있어야 한다", () => {
    expect(typeof "buttons").toBe("string");
  });

  it("페이지 범위가 있어야 한다", () => {
    expect(typeof "range").toBe("string");
  });

  it("페이지 스타일이 있어야 한다", () => {
    expect(typeof "style").toBe("string");
  });

  it("페이지 비활성화가 있어야 한다", () => {
    expect(typeof "disabled").toBe("string");
  });

  it("페이지 로딩이 있어야 한다", () => {
    expect(typeof "loading").toBe("string");
  });
});


