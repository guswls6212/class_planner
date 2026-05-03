import { describe, it, expect } from "vitest";
import {
  computeServerLastModified,
  decideOverwrite,
} from "../timestamps";

describe("computeServerLastModified", () => {
  it("빈 입력 → null", () => {
    expect(computeServerLastModified({})).toBeNull();
  });

  it("모든 entity에 updatedAt 없음 → null", () => {
    expect(
      computeServerLastModified({
        students: [{}, {}],
        subjects: [{ updatedAt: null }],
      }),
    ).toBeNull();
  });

  it("여러 배열 가로지르는 max 반환", () => {
    const result = computeServerLastModified({
      students: [{ updatedAt: "2026-05-01T10:00:00.000Z" }],
      subjects: [{ updatedAt: "2026-05-03T15:00:00.000Z" }], // max
      sessions: [{ updatedAt: "2026-05-02T09:00:00.000Z" }],
    });
    expect(result).toBe("2026-05-03T15:00:00.000Z");
  });

  it("NaN/invalid updatedAt 개별 entry skip", () => {
    const result = computeServerLastModified({
      students: [
        { updatedAt: "invalid-date" },
        { updatedAt: "2026-05-03T10:00:00.000Z" },
        { updatedAt: undefined },
      ],
    });
    expect(result).toBe("2026-05-03T10:00:00.000Z");
  });

  it("Date 객체 + ISO string 둘 다 처리", () => {
    const dateObj = new Date("2026-05-03T12:00:00.000Z");
    const result = computeServerLastModified({
      students: [{ updatedAt: dateObj }],
      subjects: [{ updatedAt: "2026-05-03T15:00:00.000Z" }],
    });
    expect(result).toBe("2026-05-03T15:00:00.000Z");
  });

  it("일부 배열만 존재해도 정상 동작", () => {
    const result = computeServerLastModified({
      students: [{ updatedAt: "2026-05-03T10:00:00.000Z" }],
    });
    expect(result).toBe("2026-05-03T10:00:00.000Z");
  });
});

describe("decideOverwrite", () => {
  const T = Date.parse("2026-05-03T12:00:00.000Z"); // base

  it("localIsEmpty=true → overwrite, local-empty (academy switch 보호)", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T + 60_000).toISOString(), // fresh "now"
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: true,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("local-empty");
  });

  it("serverLastModified=null + non-empty local → skip, server-unreachable-or-no-timestamps", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T).toISOString(),
      serverLastModified: null,
      localIsEmpty: false,
    });
    expect(result.decision).toBe("skip");
    expect(result.reason).toBe("server-unreachable-or-no-timestamps");
  });

  it("local missing/unparseable + server 있음 → overwrite, local-no-timestamp", () => {
    const result = decideOverwrite({
      localLastModified: "not-a-date",
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("local-no-timestamp");
  });

  it("local 2초 늦음 → overwrite, server-newer", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T - 2000).toISOString(),
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("server-newer");
  });

  it("local == server → overwrite, tiebreak", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T).toISOString(),
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("tiebreak");
  });

  it("local +500ms (tolerance 안) → overwrite, tiebreak", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T + 500).toISOString(),
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("tiebreak");
  });

  it("local 2초 빠름 → skip, local-newer (★ 버그 fix)", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T + 2000).toISOString(),
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
    });
    expect(result.decision).toBe("skip");
    expect(result.reason).toBe("local-newer");
    expect(result.localMs).toBe(T + 2000);
    expect(result.serverMs).toBe(T);
  });

  it("커스텀 toleranceMs 적용 (5000ms 안에선 tiebreak overwrite)", () => {
    const result = decideOverwrite({
      localLastModified: new Date(T + 4000).toISOString(),
      serverLastModified: new Date(T).toISOString(),
      localIsEmpty: false,
      toleranceMs: 5000,
    });
    expect(result.decision).toBe("overwrite");
    expect(result.reason).toBe("tiebreak");
  });
});
