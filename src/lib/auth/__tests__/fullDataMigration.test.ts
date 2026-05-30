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

// API 통일 응답 포맷: { success: false, error: { code, message } }
// (src/lib/errors/httpErrors.ts toErrorResponse 와 일치)
function makeErrorResponse(code: string, message: string, status = 400) {
  return Promise.resolve(
    new Response(JSON.stringify({ success: false, error: { code, message } }), {
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
  teachers: [],
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
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
        },
      ],
      teachers: [],
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

    // session POST에 매핑된 서버 enrollment ID와 subjectId가 사용됐는지 확인
    const sessionCall = fetchMock.mock.calls[3];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.enrollmentIds).toContain("srv-en1");
    expect(sessionBody.subjectId).toBe("srv-sub1"); // API 필수 필드
    // weekStartDate는 API 필수. 빈 문자열 입력이면 fallback이 채워야 한다.
    expect(sessionBody.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    vi.unstubAllGlobals();
  });
});

// ── Test 1b: session weekStartDate fallback (회귀 가드) ──────────────────────
// anonymous에서 만든 session이 weekStartDate=""인 채 마이그레이션될 때 API
// validation(YYYY-MM-DD required)을 통과해야 한다. 회귀 시 errorCount cascade로
// 이어져 ID 매핑 누락 폭발이 발생함 (UAT 2026-05-08 사고).
describe("migrateLocalDataToServer — session weekStartDate fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("session.weekStartDate가 비어있으면 현재 주의 월요일(KST, YYYY-MM-DD)로 fallback하여 POST한다", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" }],
      subjects: [{ id: "loc-sub1", name: "수학", color: "#ff0000" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 3,
          startsAt: "11:00",
          endsAt: "12:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
        },
      ],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))
      .mockImplementationOnce(() => makePostResponse("srv-en1"))
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(true);
    expect(result.syncedCounts.sessions).toBe(1);

    const sessionCall = fetchMock.mock.calls[3];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 월요일이어야 한다 — getWeekStartDate(KST)가 보장
    const wd = new Date(`${sessionBody.weekStartDate}T12:00:00+09:00`).getUTCDay();
    // KST noon → UTC 03:00 → 같은 날짜 유지. 월요일=1
    expect(wd).toBe(1);

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
      weekStartDate: "",
      enrollmentIds: ["srv-en1"],
    };

    const serverData: ClassPlannerData = {
      students: [serverStudent],
      subjects: [serverSubject],
      enrollments: [serverEnrollment],
      sessions: [serverSession],
      teachers: [],
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
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
        },
      ],
      teachers: [],
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
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
        },
      ],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makeErrorResponse("INTERNAL_ERROR", "서버 오류", 500))    // student fails
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
    expect(result.syncedCounts.teachers).toBe(0);
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
          weekStartDate: "",
          enrollmentIds: ["orphan-en1"], // 매핑 테이블에 없음
        },
      ],
      teachers: [],
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

// ── Test 6: Student name-conflict + matching student in serverData ───────────
describe("migrateLocalDataToServer — student name-conflict with server fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("409 name-conflict + 서버에 같은 이름 학생 → 서버 ID 재사용", async () => {
    // 서버에 이미 홍길동 학생이 있음
    const serverStudent = { id: "srv-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" };

    const serverData: ClassPlannerData = {
      students: [serverStudent],
      subjects: [],
      enrollments: [],
      sessions: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // 로컬에도 홍길동이 있음 (다른 로컬 ID)
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" }],
      subjects: [],
      enrollments: [],
      sessions: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // 학생 POST 호출 시 409 name-conflict 반환
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        makeErrorResponse(
          "STUDENT_NAME_DUPLICATE",
          "이미 존재하는 학생 이름입니다.",
          409,
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, serverData);

    // 성공 — 폴백으로 서버 ID를 재사용했으므로
    expect(result.success).toBe(true);
    expect(result.syncedCounts.students).toBe(1);
    expect(result.errors).toHaveLength(0);

    vi.unstubAllGlobals();
  });

  it("409 name-conflict + 서버 학생 폴백 + 수강 정상 추가", async () => {
    // 서버: 홍길동 학생 (male, 2010-01-01), 수학 과목
    const serverStudent = { id: "srv-s1", name: "홍길동", gender: "male", birthDate: "2010-01-01" };
    const serverSubject = { id: "srv-sub1", name: "수학", color: "#ff0000" };

    const serverData: ClassPlannerData = {
      students: [serverStudent],
      subjects: [serverSubject],
      enrollments: [],
      sessions: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // 로컬: 홍길동 학생 (female, 2010-01-01) — 이름만 같고 성별이 다름
    // findDuplicateStudent는 name+gender+birthDate 모두 일치해야 중복으로 판단하므로,
    // 성별이 다르면 POST를 시도하고, 그때 서버가 409 name-conflict 반환
    // 그러면 fallback으로 서버의 홍길동을 찾아서 ID 재사용
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "홍길동", gender: "female", birthDate: "2010-01-01" }],
      subjects: [{ id: "loc-sub1", name: "영어", color: "#00ff00" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    let callCount = 0;
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      callCount++;
      if (callCount === 1) {
        // 학생 POST: 409 name-conflict (통일 에러 포맷)
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "STUDENT_NAME_DUPLICATE",
              message: "이미 존재하는 학생 이름입니다.",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      } else if (callCount === 2) {
        // 과목 POST: 영어 과목 추가
        return new Response(
          JSON.stringify({ success: true, data: { id: "srv-sub2" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else if (callCount === 3) {
        // 수강 POST: srv-s1(폴백) + srv-sub2 추가
        return new Response(
          JSON.stringify({ success: true, data: { id: "srv-en1" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error("Unexpected call count: " + callCount);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, serverData);

    expect(result.success).toBe(true);
    expect(result.syncedCounts.students).toBe(1);       // 폴백 카운트
    expect(result.syncedCounts.subjects).toBe(1);       // 영어 신규
    expect(result.syncedCounts.enrollments).toBe(1);    // 수강 신규
    expect(result.errors).toHaveLength(0);

    // 수강 POST에 폴백된 학생 ID와 신규 과목 ID 확인
    const enrollmentCall = fetchMock.mock.calls[2];
    const enrollmentOptions = enrollmentCall[1] as RequestInit;
    const enrollmentBody = JSON.parse(enrollmentOptions.body as string);
    expect(enrollmentBody.studentId).toBe("srv-s1");     // 폴백 ID
    expect(enrollmentBody.subjectId).toBe("srv-sub2");   // 신규 과목 ID

    vi.unstubAllGlobals();
  });
});

// ── Test 7: Student name-conflict but NO matching student in serverData ──────
describe("migrateLocalDataToServer — student name-conflict without server fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("409 name-conflict + 서버에 매칭 학생 없음 → 오류 기록, 수강/수업 건너뜀", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "김철수", gender: "female", birthDate: "2012-03-15" }],
      subjects: [{ id: "loc-sub1", name: "수학", color: "#ff0000" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 2,
          startsAt: "14:00",
          endsAt: "15:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
        },
      ],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        // 학생 POST: 409 name-conflict 오류 (통일 에러 포맷)
        makeErrorResponse(
          "STUDENT_NAME_DUPLICATE",
          "이미 존재하는 학생 이름입니다.",
          409,
        ),
      )
      .mockImplementationOnce(() => makePostResponse("srv-sub1"));    // 과목 OK

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(false);
    // 학생: 0 (폴백 실패)
    expect(result.syncedCounts.students).toBe(0);
    // 과목: 1 (성공)
    expect(result.syncedCounts.subjects).toBe(1);
    // 수강: 0 (학생 ID 없어서 매핑 실패)
    expect(result.syncedCounts.enrollments).toBe(0);
    // 수업: 0 (수강 매핑 없어서 실패)
    expect(result.syncedCounts.sessions).toBe(0);

    // 오류 배열 확인
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.entity === "student" && e.localId === "loc-s1")).toBe(true);
    expect(result.errors.some((e) => e.entity === "enrollment" && e.localId === "loc-en1")).toBe(true);
    expect(result.errors.some((e) => e.entity === "session" && e.localId === "loc-sess1")).toBe(true);

    // [object Object] 회귀 가드 (UAT 2026-05-08 사고) — error 객체가 그대로 message에
    // 누적되면 사용자 모달에 "student: [object Object]"로 보인다. extractErrorMessage가
    // error.message 만 추출하는지 확인.
    const studentError = result.errors.find((e) => e.entity === "student");
    expect(studentError?.message).toBe("이미 존재하는 학생 이름입니다.");
    expect(studentError?.message).not.toContain("[object Object]");

    vi.unstubAllGlobals();
  });
});

// ── Test 8: Teachers — anonymous → server 마이그레이션 (UAT 2026-05-09 회귀) ──
// anonymous 모드에서 schedule 인라인으로 추가한 강사가 로그인 후 server에 누락되어
// 사라지던 사고를 막는 회귀 가드. session.teacherId도 함께 reconcile돼야 한다.
describe("migrateLocalDataToServer — teachers anonymous→server (UAT 2026-05-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("강사 + session.teacherId 함께 마이그레이션 — server ID로 reconcile된 채 session POST", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "이현진" }],
      subjects: [{ id: "loc-sub1", name: "공업수학", color: "#3b82f6" }],
      teachers: [
        { id: "loc-t1", name: "김학성", color: "#6366f1", role: "member" },
      ],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
          teacherId: "loc-t1",
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // 순서: student → subject → teacher → enrollment → session
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))
      .mockImplementationOnce(() => makePostResponse("srv-t1"))
      .mockImplementationOnce(() => makePostResponse("srv-en1"))
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(true);
    expect(result.syncedCounts.teachers).toBe(1);
    expect(result.syncedCounts.sessions).toBe(1);
    expect(result.errors).toHaveLength(0);

    // teacher POST가 일어났는지 + body에 name/color 포함
    const teacherCall = fetchMock.mock.calls[2];
    expect(teacherCall[0]).toContain("/api/teachers");
    const teacherBody = JSON.parse(teacherCall[1].body);
    expect(teacherBody.name).toBe("김학성");
    expect(teacherBody.color).toBe("#6366f1");
    expect(teacherBody.role).toBe("member");

    // session POST의 teacherId가 server ID로 reconcile됐는지
    const sessionCall = fetchMock.mock.calls[4];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.teacherId).toBe("srv-t1");

    vi.unstubAllGlobals();
  });

  it("server에 같은 이름 강사 존재 시 POST 안 호출, idMap으로 reconcile해 session.teacherId가 server ID로 전송", async () => {
    const serverData: ClassPlannerData = {
      students: [],
      subjects: [],
      teachers: [{ id: "srv-existing-t", name: "김학성", color: "#000" }],
      enrollments: [],
      sessions: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "이현진" }],
      subjects: [{ id: "loc-sub1", name: "공업수학", color: "#3b82f6" }],
      teachers: [
        { id: "loc-t1", name: "김학성", color: "#6366f1" }, // server에 같은 이름 존재
      ],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
          teacherId: "loc-t1",
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // teacher POST는 호출 안 됨 (중복) → student/subject/enrollment/session 4번
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))
      .mockImplementationOnce(() => makePostResponse("srv-en1"))
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, serverData);

    expect(result.success).toBe(true);
    expect(result.syncedCounts.teachers).toBe(1); // 중복도 카운트 (mapping 성공)
    expect(fetchMock).toHaveBeenCalledTimes(4); // teacher POST 호출 안 됨

    // session POST의 teacherId가 server existing teacher id로 전송됐는지
    const sessionCall = fetchMock.mock.calls[3];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.teacherId).toBe("srv-existing-t");

    vi.unstubAllGlobals();
  });

  it("강사 mig 실패 시 session.teacherId 매핑 누락 → session POST body에서 teacherId 제외 (FK 보호)", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "이현진" }],
      subjects: [{ id: "loc-sub1", name: "공업수학", color: "#3b82f6" }],
      teachers: [{ id: "loc-t1", name: "김학성", color: "#6366f1" }],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
          teacherId: "loc-t1",
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    // teacher POST 500 실패, 나머지 OK
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))
      .mockImplementationOnce(() => makeErrorResponse("INTERNAL_ERROR", "서버 오류", 500))
      .mockImplementationOnce(() => makePostResponse("srv-en1"))
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));

    vi.stubGlobal("fetch", fetchMock);

    const result = await migrateLocalDataToServer("user-1", localData, emptyServerData);

    expect(result.success).toBe(false);
    expect(result.syncedCounts.teachers).toBe(0);
    expect(result.errors.some((e) => e.entity === "teacher" && e.localId === "loc-t1")).toBe(true);

    // session은 그대로 등록됐지만 teacherId는 매핑 누락이므로 body에서 제외 — FK 위반 방지
    const sessionCall = fetchMock.mock.calls[4];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect(sessionBody.teacherId).toBeUndefined();
    expect(result.syncedCounts.sessions).toBe(1);

    vi.unstubAllGlobals();
  });

  it("session.teacherId가 없으면 session POST body에 teacherId 키 자체가 없음", async () => {
    const localData: ClassPlannerData = {
      students: [{ id: "loc-s1", name: "이현진" }],
      subjects: [{ id: "loc-sub1", name: "공업수학", color: "#3b82f6" }],
      teachers: [],
      enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
      sessions: [
        {
          id: "loc-sess1",
          weekday: 1,
          startsAt: "09:00",
          endsAt: "10:00",
          weekStartDate: "",
          enrollmentIds: ["loc-en1"],
          // teacherId 없음
        },
      ],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => makePostResponse("srv-s1"))
      .mockImplementationOnce(() => makePostResponse("srv-sub1"))
      .mockImplementationOnce(() => makePostResponse("srv-en1"))
      .mockImplementationOnce(() => makePostResponse("srv-sess1"));

    vi.stubGlobal("fetch", fetchMock);

    await migrateLocalDataToServer("user-1", localData, emptyServerData);

    const sessionCall = fetchMock.mock.calls[3];
    const sessionBody = JSON.parse(sessionCall[1].body);
    expect("teacherId" in sessionBody).toBe(false);

    vi.unstubAllGlobals();
  });
});
