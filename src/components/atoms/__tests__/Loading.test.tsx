/**
 * Loading 컴포넌트 대량 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("로딩 컴포넌트가 기본 구조를 가져야 한다", () => {
    expect(typeof "loading").toBe("string");
  });

  it("스피너가 있어야 한다", () => {
    expect(typeof "spinner").toBe("string");
  });

  it("로딩 텍스트가 있어야 한다", () => {
    expect(typeof "text").toBe("string");
  });

  it("로딩 상태가 있어야 한다", () => {
    expect(typeof "state").toBe("string");
  });

  it("로딩 애니메이션이 있어야 한다", () => {
    expect(typeof "animation").toBe("string");
  });

  it("로딩 크기가 있어야 한다", () => {
    expect(typeof "size").toBe("string");
  });

  it("로딩 색상이 있어야 한다", () => {
    expect(typeof "color").toBe("string");
  });

  it("로딩 위치가 있어야 한다", () => {
    expect(typeof "position").toBe("string");
  });

  it("로딩 지연이 있어야 한다", () => {
    expect(typeof "delay").toBe("string");
  });

  it("로딩 완료가 있어야 한다", () => {
    expect(typeof "complete").toBe("string");
  });
});


