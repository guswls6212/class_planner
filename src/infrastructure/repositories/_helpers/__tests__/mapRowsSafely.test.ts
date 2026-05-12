/**
 * mapRowsSafely 단위 테스트.
 *
 * Invariant 위반 row가 전체 결과를 빈 배열로 swallow하던 함정 차단 확인.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "../../../../lib/logger";
import { mapRowsSafely } from "../mapRowsSafely";

describe("mapRowsSafely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모든 row가 valid면 N개 모두 매핑된다", () => {
    const rows = [
      { id: "1", name: "철수" },
      { id: "2", name: "영희" },
      { id: "3", name: "민수" },
    ];

    const result = mapRowsSafely(
      rows,
      (row) => ({ id: row.id, displayName: row.name }),
      { entity: "학생", idField: "id" }
    );

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("invariant 위반 row 1개가 있어도 나머지 valid row N-1개가 반환된다", () => {
    const rows = [
      { id: "1", name: "철수" },
      { id: "2", name: "X" }, // 1글자 — invariant 위반
      { id: "3", name: "민수" },
    ];

    const result = mapRowsSafely(
      rows,
      (row) => {
        if (row.name.length < 2) {
          throw new Error("이름은 2글자 이상이어야 합니다");
        }
        return { id: row.id, displayName: row.name };
      },
      { entity: "학생", idField: "id" }
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(["1", "3"]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("학생"),
      expect.objectContaining({
        entity: "학생",
        id: "2",
        error: "이름은 2글자 이상이어야 합니다",
      })
    );
  });

  it("모든 row가 invariant 위반이면 빈 배열을 반환한다 (각 row warn)", () => {
    const rows = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ];

    const result = mapRowsSafely(
      rows,
      (row) => {
        if (row.name.length < 2) {
          throw new Error("invariant 위반");
        }
        return row;
      },
      { entity: "과목", idField: "id" }
    );

    expect(result).toEqual([]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("rows가 빈 배열이면 빈 배열을 반환하고 warn 호출 없음", () => {
    const result = mapRowsSafely(
      [],
      (row) => row,
      { entity: "강사", idField: "id" }
    );

    expect(result).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("idField 미지정 시 id는 undefined로 로그된다", () => {
    const rows = [{ name: "X" }];

    mapRowsSafely(
      rows,
      () => {
        throw new Error("test error");
      },
      { entity: "등록" }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: undefined, error: "test error" })
    );
  });

  it("Error 객체가 아닌 throw도 message로 캡처한다", () => {
    const rows = [{ id: "1" }];

    mapRowsSafely(
      rows,
      () => {
        throw "문자열 throw";
      },
      { entity: "학생", idField: "id" }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: "문자열 throw" })
    );
  });
});
