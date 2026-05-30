/**
 * 회귀 가드 — anonymous→server 마이그레이션 부분/전체 실패 회복력 (S-1.5 race-gap).
 *
 * SSOT: src/lib/auth/handleLoginDataMigration.ts applyLocalDataChoice (line 164-187).
 * 잠그는 동작 (2026-05-29 migration-partial-failure-resilience 사고 + finding S-1.5):
 *
 *   anonymous 키 삭제 조건  = (totalSynced > 0 || anonymousData.students.length === 0)
 *   anonymous 키 보존 조건  = totalSynced === 0 && anonymousData.students.length > 0
 *
 * 의도:
 *  - 1개라도 동기화됐으면(부분 성공) anonymous 삭제 → 다음 로그인 재flood loop 차단.
 *  - 전부 실패 + 학생이 있으면 anonymous 보존 → transient(네트워크) 실패일 수 있어
 *    다음 로그인 재시도 여지 확보.
 *  - 전부 실패 + 학생이 0이면(영구 실패할 student-less 데이터: enrollment-only 등)
 *    anonymous 삭제 → 절대 성공 못 할 레코드가 매 로그인 재시도되며 무한 spinner 거는
 *    것을 차단. (line 168 의 `|| anonymousData.students.length === 0` 분기)
 *  - 부분/전체 실패 모두 throw 하지 않고 실패 레코드를 caller(failed[])로 반환 →
 *    useGlobalDataInitialization 이 toast.warning('일부 데이터 동기화 안 됨')으로 표면화.
 *
 * 결정적: timing 의존 없음. fetch(re-fetch GET 5개) + migrateLocalDataToServer 모두 mock.
 * 기존 spec(handleLoginDataMigration.test.ts)이 커버하는 두 분기에 더해, 이 spec 은
 * 'totalSynced===0 && students===0 → 삭제' 의 미커버 회복력 분기를 명시적으로 잠근다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyLocalDataChoice } from "../handleLoginDataMigration";
import type { ClassPlannerData } from "../../localStorageCrud";

// ── localStorage mock (jsdom 의 window.localStorage 를 결정적 backing store 로 교체) ──
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  }),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

vi.mock("../../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// migrateLocalDataToServer mock — 각 test 가 mockResolvedValueOnce 로 결과 주입.
const migrateLocalDataToServerMock = vi.fn();
vi.mock("../fullDataMigration", () => ({
  migrateLocalDataToServer: (...args: unknown[]) =>
    migrateLocalDataToServerMock(...args),
}));

const ANON_KEY = "classPlannerData:anonymous";
const USER_ID = `user-${Math.random().toString(36).slice(2)}`;

const emptyServerData: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

/** 학생을 가진 anonymous 데이터 (보존 분기 트리거용). */
function anonWithStudents(): ClassPlannerData {
  return {
    students: [{ id: "anon-s1", name: "익명학생" }],
    subjects: [{ id: "anon-sub1", name: "익명과목", color: "#00ff00" }],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };
}

/** 학생 0개지만 비어있지 않은 anonymous 데이터 — enrollment-only (영구 실패 student-less). */
function anonStudentlessButNonEmpty(): ClassPlannerData {
  return {
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [{ id: "anon-e1", studentId: "missing-s", subjectId: "missing-sub" }],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };
}

/** re-fetch GET 5개를 success:true, data:[] 로 응답하는 fetch mock. */
function stubReFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ success: true, data: [] }), {
      headers: { "Content-Type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("applyLocalDataChoice — 마이그레이션 부분/전체 실패 회복력 (S-1.5 회귀 가드)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("부분 성공 (totalSynced>0) — anonymous 삭제로 재flood loop 차단 + 실패 레코드 반환", async () => {
    storage[ANON_KEY] = JSON.stringify(anonWithStudents());
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 1, subjects: 0, teachers: 0, enrollments: 0, sessions: 0 },
      errors: [{ entity: "session", localId: "anon-sess1", message: "강사 미배정" }],
    });
    const fetchMock = stubReFetchOk();

    const result = await applyLocalDataChoice(USER_ID, emptyServerData);

    // 1개라도 동기화됨 → anonymous 삭제 (다음 로그인 재시도 안 함)
    expect(storage[ANON_KEY]).toBeUndefined();
    // throw 안 하고 re-fetch 끝까지 진행 (GET 5개)
    expect(fetchMock).toHaveBeenCalledTimes(5);
    // 실패 레코드는 caller 로 반환 → toast.warning 표면화
    expect(result.totalSynced).toBe(1);
    expect(result.failed).toEqual([{ entity: "session", message: "강사 미배정" }]);
    // supabase_user_id 설정 (getStorageKey 가 올바른 키 반환하도록)
    expect(storage["supabase_user_id"]).toBe(USER_ID);
  });

  it("전체 실패 + 학생 있음 (totalSynced===0, students>0) — anonymous 보존 (transient 재시도 여지)", async () => {
    const anon = anonWithStudents();
    storage[ANON_KEY] = JSON.stringify(anon);
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 0, subjects: 0, teachers: 0, enrollments: 0, sessions: 0 },
      errors: [{ entity: "student", localId: "anon-s1", message: "네트워크 오류" }],
    });
    stubReFetchOk();

    const result = await applyLocalDataChoice(USER_ID, emptyServerData);

    // 0개 동기화 + 학생 존재 → 보존 (다음 로그인 재시도)
    expect(storage[ANON_KEY]).toBe(JSON.stringify(anon));
    expect(result.totalSynced).toBe(0);
    expect(result.failed).toHaveLength(1);
  });

  it("전체 실패 + 학생 0개 (totalSynced===0, students===0) — anonymous 삭제로 영구실패 loop 차단 (미커버 회복력 분기)", async () => {
    // enrollment-only 같은 student-less 데이터: 절대 성공 못 함.
    // 보존하면 매 로그인 재시도 → 무한 spinner. line 168 의
    // `|| anonymousData.students.length === 0` 가 이를 끊는다.
    storage[ANON_KEY] = JSON.stringify(anonStudentlessButNonEmpty());
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 0, subjects: 0, teachers: 0, enrollments: 0, sessions: 0 },
      errors: [{ entity: "enrollment", localId: "anon-e1", message: "FK 위반 (학생 없음)" }],
    });
    stubReFetchOk();

    const result = await applyLocalDataChoice(USER_ID, emptyServerData);

    // students.length===0 → totalSynced 0 이어도 삭제 (영구 실패 재flood 차단)
    expect(storage[ANON_KEY]).toBeUndefined();
    expect(result.totalSynced).toBe(0);
    expect(result.failed).toEqual([{ entity: "enrollment", message: "FK 위반 (학생 없음)" }]);
  });

  it("부분/전체 실패 어느 경우도 throw 하지 않는다 (step 2-5 도달 보장)", async () => {
    storage[ANON_KEY] = JSON.stringify(anonWithStudents());
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: false,
      syncedCounts: { students: 0, subjects: 0, teachers: 0, enrollments: 0, sessions: 0 },
      errors: [{ entity: "student", localId: "anon-s1", message: "정책 위반" }],
    });
    stubReFetchOk();

    // !result.success 여도 reject 가 아니라 resolve 되어야 함 (회복력 핵심)
    await expect(
      applyLocalDataChoice(USER_ID, emptyServerData)
    ).resolves.toMatchObject({ totalSynced: 0 });
  });

  it("완전 성공 (totalSynced>0, 실패 0개) — anonymous 삭제 + failed 빈 배열", async () => {
    storage[ANON_KEY] = JSON.stringify(anonWithStudents());
    migrateLocalDataToServerMock.mockResolvedValueOnce({
      success: true,
      syncedCounts: { students: 1, subjects: 1, teachers: 0, enrollments: 0, sessions: 0 },
      errors: [],
    });
    stubReFetchOk();

    const result = await applyLocalDataChoice(USER_ID, emptyServerData);

    expect(storage[ANON_KEY]).toBeUndefined();
    expect(result.totalSynced).toBe(2);
    expect(result.failed).toEqual([]);
  });
});