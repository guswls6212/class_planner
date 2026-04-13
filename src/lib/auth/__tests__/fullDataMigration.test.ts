import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrateLocalDataToServer } from "../fullDataMigration";
import type { ClassPlannerData } from "../../localStorageCrud";

vi.mock("../../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

function makePostResponse(id: string) {
  return Promise.resolve(
    new Response(JSON.stringify({ success: true, data: { id } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function makeErrorResponse(message: string, status = 400) {
  return Promise.resolve(
    new Response(JSON.stringify({ success: false, message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

const emptyServerData: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

// ── Test 1: Happy path — 서버 데이터 없음, 전체 업로드 ───────────────────────
describe("migrateLocalDataToServer — happy path (no server data)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모든 로컬 엔티티를 서버에 업로드하고 카운트/ID 매핑이 정확하다", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" }],
      subjects: [{ id: "loc-sub1", name: "수학", color: "#ff0000" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["loc-en1"],
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))       // student
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))     // subject
      .mockImplementationOnce(() => makePostResponse("srv-en1"))      // enrollment
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));   // session

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(true);
    expect(result.syncedCounts.students).toBe(1);
    expect(result.syncedCounts.subjects).toBe(1);
    expect(result.syncedCounts.enrollments).toBe(1);
    expect(result.syncedCounts.sessions).toBe(1);
    expect(result.errors).toHaveLength(0);

    // enrollment POST에 매핑된 서버 ID가 사용됐는지 확인
    const enrollmentCall = fetchMock.mock.calls[2];
    const enrollmentBody = JSON.parse(enrollmentCall[1].body);
    expect(enrollmentBody.studentId).toBe("srv-s1");
    expect(enrollmentBody.subjectId).toBe("srv-sub1");

    // session POST에 매핑된 서버 enrollment ID가 사용됐는지 확인
    const sessionCall = fetchMock.mock.calls[3];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.enrollmentIds).toContain("srv-en1");

    vi.unstubAllGlobals();
  });
});

// ── Test 2: 전체 중복 — 아무것도 업로드 안 함 ──────────────────────────────────
describe("migrateLocalDataToServer — all duplicates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생/과목/수강/수업 모두 서버에 중복이면 fetch를 호출하지 않는다", async () => {
    const serverStudent = { id: "srv-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" };
    const serverSubject = { id: "srv-sub1", name: "수학", color: "#ff0000" };
    const serverEnrollment = { id: "srv-en1", studentId: "srv-s1", subjectId: "srv-sub1" };
    const serverSession = {
      id: "srv-sess1",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: ["srv-en1"],
    };

    const serverData: ClassPlannerData = {
      students: [serverStudent],
      subjects: [serverSubject],
      enrollments: [serverEnrollment],
      sessions: [serverSession],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" }],
      subjects: [{ id: "loc-sub1", name: "수학", color: "#ff0000" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["loc-en1"],
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, serverData);

    // fetch 호출 없음 (모두 중복)
    expect(fetchMock).not.toHaveBeenCalled();

    // 학생/과목/수강 카운트는 올라감 (세션 중복은 카운트 안 올림)
    expect(result.syncedCounts.students).toBe(1);
    expect(result.syncedCounts.subjects).toBe(1);
    expect(result.syncedCounts.enrollments).toBe(1);
    expect(result.syncedCounts.sessions).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.success).toBe(true);

    vi.unstubAllGlobals();
  });
});

// ── Test 3: 학생 업로드 실패 → enrollment/session 건너뜀 ─────────────────────
describe("migrateLocalDataToServer — student upload error cascades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("학생 업로드 실패 시 해당 학생의 enrollment, session도 건너뛴다", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "실패 학생" }],
      subjects: [{ id: "loc-sub1", name: "수학", color: "#ff0000" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["loc-en1"],
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makeErrorResponse("서버 오류"))    // student fails
      .mockImplementationOnce(() => makePostResponse("srv-sub1"));    // subject OK

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(false);
    expect(result.syncedCounts.students).toBe(0);
    expect(result.syncedCounts.subjects).toBe(1);
    expect(result.syncedCounts.enrollments).toBe(0);
    expect(result.syncedCounts.sessions).toBe(0);

    // 학생 실패 오류
    expect(result.errors.some((e) => e.entity === "student" && e.localId === "loc-s1")).toBe(true);
    // enrollment는 ID 매핑 누락으로 오류
    expect(result.errors.some((e) => e.entity === "enrollment" && e.localId === "loc-en1")).toBe(true);
    // session은 enrollment 매핑 없어서 오류
    expect(result.errors.some((e) => e.entity === "session" && e.localId === "loc-sess1")).toBe(true);

    vi.unstubAllGlobals();
  });
});

// ── Test 4: 빈 로컬 데이터 ────────────────────────────────────────────────────
describe("migrateLocalDataToServer — empty local data", () => {
  it("빈 로컬 데이터는 success=true, 모든 카운트 0", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", emptyServerData, emptyServerData);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.syncedCounts.students).toBe(0);
    expect(result.syncedCounts.subjects).toBe(0);
    expect(result.syncedCounts.enrollments).toBe(0);
    expect(result.syncedCounts.sessions).toBe(0);
    expect(result.errors).toHaveLength(0);

    vi.unstubAllGlobals();
  });
});

// ── Test 5: Session — enrollment 매핑 없음 ───────────────────────────────────
describe("migrateLocalDataToServer — session with unmapped enrollments", () => {
  it("session의 enrollmentIds가 모두 매핑 안 되면 오류 로그 후 건너뜀", async () => {
    const localData: ClassPlannerData = {
      students: [],
      subjects: [],
      enrollments: [],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 2,
          startsAt: "14:00",
          endsAt: "15:00",
          enrollmentIds: ["orphan-en1"], // 매핑 테이블에 없음
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.syncedCounts.sessions).toBe(0);
    expect(result.errors.some((e) => e.entity === "session" && e.localId === "loc-sess1")).toBe(true);
    expect(result.success).toBe(false);

    vi.unstubAllGlobals();
  });
});
