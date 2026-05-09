import { describe, expect, it } from "vitest";
import { detectPartialCorruption } from "../useGlobalDataInitialization";
import type { ClassPlannerData } from "../../lib/localStorageCrud";

function makeData(overrides: Partial<ClassPlannerData> = {}): ClassPlannerData {
  return {
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
    lastModified: "",
    ...overrides,
  };
}

describe("detectPartialCorruption", () => {
  it("localIsEmpty=true이면 partial 아님 (정상 빈 상태)", () => {
    const local = makeData();
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    expect(detectPartialCorruption(local, server, true)).toBe(false);
  });

  it("local sessions=0 + students 있음 + server sessions 있음 → partial 손상", () => {
    const local = makeData({ students: [{ id: "stu1" } as never] });
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    expect(detectPartialCorruption(local, server, false)).toBe(true);
  });

  it("local sessions=0 + subjects만 있음 → partial 아님 (학생 모두 삭제한 정상 흐름)", () => {
    // UAT 2026-05-09: 사용자가 학생 다 삭제하면 students=0 + enrollments=0이지만
    // subjects는 사용자가 안 지웠으면 그대로 있을 수 있다. 이 케이스는 corruption이
    // 아니라 정상 의도. server in-flight 상태에서 server overwrite 강제하면 학생 부활.
    const local = makeData({ subjects: [{ id: "sub1" } as never] });
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    expect(detectPartialCorruption(local, server, false)).toBe(false);
  });

  it("local sessions=0 + enrollments 있음 + server sessions 있음 → partial 손상", () => {
    const local = makeData({ enrollments: [{ id: "e1" } as never] });
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    expect(detectPartialCorruption(local, server, false)).toBe(true);
  });

  it("local sessions 있음 → partial 아님 (정상 데이터)", () => {
    const local = makeData({
      students: [{ id: "stu1" } as never],
      sessions: [{ id: "s1" } as never],
    });
    const server = makeData({ sessions: [{ id: "s2" } as never] });
    expect(detectPartialCorruption(local, server, false)).toBe(false);
  });

  it("server sessions=0이면 partial 손상이라도 overwrite 의미 없음 → false", () => {
    const local = makeData({ students: [{ id: "stu1" } as never] });
    const server = makeData();
    expect(detectPartialCorruption(local, server, false)).toBe(false);
  });

  it("local 전체 비어있고 server에 sessions 있음 → partial 아님 (그냥 empty, decideOverwrite 처리)", () => {
    const local = makeData();
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    // localIsEmpty=true → not partial
    expect(detectPartialCorruption(local, server, true)).toBe(false);
  });

  it("local에 teachers만 있고 다른 entity 없음 + server sessions 있음 → partial 아님", () => {
    // teachers는 partial 판정 기준에서 제외 (sessions 흐름과 직접 연관 약함)
    const local = makeData({ teachers: [{ id: "t1" } as never] });
    const server = makeData({ sessions: [{ id: "s1" } as never] });
    expect(detectPartialCorruption(local, server, false)).toBe(false);
  });
});
