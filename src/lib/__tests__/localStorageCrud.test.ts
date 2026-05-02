/**
 * localStorage CRUD 유틸리티 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addStudentToLocal,
  addSubjectToLocal,
  addTeacherToLocal,
  clearActiveAcademy,
  clearClassPlannerData,
  clearUserClassPlannerData,
  deleteStudentFromLocal,
  deleteSubjectFromLocal,
  ANONYMOUS_STORAGE_KEY,
  getAllStudentsFromLocal,
  getAllSubjectsFromLocal,
  getActiveAcademyId,
  getClassPlannerData,
  getStudentFromLocal,
  getSubjectFromLocal,
  setActiveAcademyId,
  setClassPlannerData,
  updateStudentInLocal,
  updateSubjectInLocal,
  updateTeacherInLocal,
} from "../localStorageCrud";

// Mock dependencies
vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../timeUtils", () => ({
  getKSTTime: () => "2025-09-21T16:00:00.000+09:00",
}));

// Mock localStorage with actual storage behavior
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
};

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(window, "dispatchEvent", {
  value: mockDispatchEvent,
});

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(2),
  },
});

describe("localStorage CRUD 유틸리티", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // storage 내용 초기화
    Object.keys(storage).forEach((key) => delete storage[key]);

    // 모의 구현 리셋 (이전 테스트에서 덮어쓴 구현 복원)
    localStorageMock.getItem.mockImplementation(
      (key: string) => storage[key] || null
    );
    localStorageMock.setItem.mockImplementation(
      (key: string, value: string) => {
        storage[key] = value;
      }
    );
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete storage[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    });

    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockDispatchEvent.mockClear();
  });

  describe("기본 데이터 조작", () => {
    it("빈 데이터에서 기본값을 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const data = getClassPlannerData();

      expect(data).toMatchObject({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
      });
      expect(data.lastModified).toBeTruthy();
      expect(typeof data.lastModified).toBe("string");
    });

    it("데이터를 성공적으로 저장해야 한다", () => {
      const testData = {
        students: [{ id: "test-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        teachers: [],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };

      const result = setClassPlannerData(testData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "classPlannerData:anonymous",
        expect.stringContaining("김철수")
      );
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "classPlannerDataChanged",
        })
      );
    });

    it("데이터를 성공적으로 초기화해야 한다", () => {
      const result = clearClassPlannerData();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "classPlannerData:anonymous"
      );
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "classPlannerDataCleared",
        })
      );
    });
  });

  describe("Students CRUD", () => {
    beforeEach(() => {
      // 기본 데이터 설정
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          students: [
            { id: "student-1", name: "김철수" },
            { id: "student-2", name: "이영희" },
          ],
          subjects: [
            { id: "subject-1", name: "수학", color: "#ff0000" },
            { id: "subject-2", name: "영어", color: "#00ff00" },
          ],
          // 세션/등록 기본값은 각 테스트에서 사용 목적에 맞게 구성
          sessions: [],
          enrollments: [],
          version: "1.0",
          lastModified: new Date().toISOString(),
        })
      );
    });

    it("학생을 성공적으로 추가해야 한다", () => {
      const result = addStudentToLocal("박민수");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: expect.stringContaining("test-uuid-"),
        name: "박민수",
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("중복 이름 학생 추가 시 에러를 반환해야 한다", () => {
      const result = addStudentToLocal("김철수"); // 이미 존재하는 이름

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 같은 이름의 학생이 존재합니다.");
    });

    it("학생을 성공적으로 수정해야 한다", () => {
      const result = updateStudentInLocal("student-1", { name: "김철민" });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("김철민");
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("존재하지 않는 학생 수정 시 에러를 반환해야 한다", () => {
      const result = updateStudentInLocal("non-existent", { name: "새이름" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("학생을 찾을 수 없습니다.");
    });

    it("학생을 성공적으로 삭제해야 한다", () => {
      const result = deleteStudentFromLocal("student-1");

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("존재하지 않는 학생 삭제 시 에러를 반환해야 한다", () => {
      const result = deleteStudentFromLocal("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe("학생을 찾을 수 없습니다.");
    });

    it("학생 삭제 시 해당 학생의 enrollments와 세션(enrollmentIds 기반)이 함께 정리되어야 한다 (단독 세션)", () => {
      // 데이터 구성: student-1의 단독 enrollment와 그 enrollment만 가진 세션 1개
      const initial = {
        students: [
          { id: "student-1", name: "김철수" },
          { id: "student-2", name: "이영희" },
        ],
        subjects: [{ id: "subject-1", name: "수학", color: "#ff0000" }],
        enrollments: [
          { id: "enroll-1", studentId: "student-1", subjectId: "subject-1" },
        ],
        sessions: [
          {
            id: "session-1",
            enrollmentIds: ["enroll-1"],
            weekday: 0,
            startsAt: "10:00",
            endsAt: "11:00",
            yPosition: 1,
          },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initial));

      const res = deleteStudentFromLocal("student-1");
      expect(res.success).toBe(true);

      const lastSetCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const saved = JSON.parse(lastSetCall[1] as string);
      // student-1 제거
      expect(
        saved.students.find((s: any) => s.id === "student-1")
      ).toBeUndefined();
      // enrollments 제거
      expect(
        saved.enrollments.some((e: any) => e.studentId === "student-1")
      ).toBe(false);
      // 해당 enrollment만 가진 세션은 삭제됨
      expect(saved.sessions.some((s: any) => s.id === "session-1")).toBe(false);
    });

    it("학생 삭제 시 공유 세션의 enrollmentIds에서 해당 학생의 enrollment만 제거되고, 남아있으면 세션 유지되어야 한다 (그룹 세션)", () => {
      // 데이터 구성: session-1은 student-1과 student-2의 enrollment를 함께 가짐
      const initial = {
        students: [
          { id: "student-1", name: "김철수" },
          { id: "student-2", name: "이영희" },
        ],
        subjects: [{ id: "subject-1", name: "수학", color: "#ff0000" }],
        enrollments: [
          { id: "enroll-1", studentId: "student-1", subjectId: "subject-1" },
          { id: "enroll-2", studentId: "student-2", subjectId: "subject-1" },
        ],
        sessions: [
          {
            id: "session-1",
            enrollmentIds: ["enroll-1", "enroll-2"],
            weekday: 0,
            startsAt: "10:00",
            endsAt: "11:00",
            yPosition: 1,
          },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(initial));

      const res = deleteStudentFromLocal("student-1");
      expect(res.success).toBe(true);

      const lastSetCall =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ];
      const saved = JSON.parse(lastSetCall[1] as string);
      // student-1 제거
      expect(
        saved.students.find((s: any) => s.id === "student-1")
      ).toBeUndefined();
      // student-1의 enrollment(enroll-1) 제거
      expect(saved.enrollments.some((e: any) => e.id === "enroll-1")).toBe(
        false
      );
      // 세션은 유지되되, enrollmentIds에서 enroll-1만 제거되고 enroll-2는 남음
      const session = saved.sessions.find((s: any) => s.id === "session-1");
      expect(session).toBeTruthy();
      expect(session.enrollmentIds).toEqual(["enroll-2"]);
    });

    it("특정 학생을 조회해야 한다", () => {
      const student = getStudentFromLocal("student-1");

      expect(student).toEqual({
        id: "student-1",
        name: "김철수",
      });
    });

    it("모든 학생을 조회해야 한다", () => {
      const students = getAllStudentsFromLocal();

      expect(students).toHaveLength(2);
      expect(students[0].name).toBe("김철수");
      expect(students[1].name).toBe("이영희");
    });
  });

  describe("Subjects CRUD", () => {
    beforeEach(() => {
      // 기본 데이터 설정
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          students: [],
          subjects: [
            { id: "subject-1", name: "수학", color: "#ff0000" },
            { id: "subject-2", name: "영어", color: "#00ff00" },
          ],
          sessions: [],
          enrollments: [],
          version: "1.0",
          lastModified: new Date().toISOString(),
        })
      );
    });

    it("과목을 성공적으로 추가해야 한다", () => {
      const result = addSubjectToLocal("과학", "#0000ff");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: expect.stringContaining("test-uuid-"),
        name: "과학",
        color: "#0000ff",
      });
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("중복 이름 과목 추가 시 에러를 반환해야 한다", () => {
      const result = addSubjectToLocal("수학", "#ff0000"); // 이미 존재하는 이름

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 같은 이름의 과목이 존재합니다.");
    });

    it("과목을 성공적으로 수정해야 한다", () => {
      const result = updateSubjectInLocal("subject-1", {
        name: "고급수학",
        color: "#ff00ff",
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("고급수학");
      expect(result.data?.color).toBe("#ff00ff");
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("과목을 성공적으로 삭제해야 한다", () => {
      const result = deleteSubjectFromLocal("subject-1");

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("특정 과목을 조회해야 한다", () => {
      const subject = getSubjectFromLocal("subject-1");

      expect(subject).toEqual({
        id: "subject-1",
        name: "수학",
        color: "#ff0000",
      });
    });

    it("모든 과목을 조회해야 한다", () => {
      const subjects = getAllSubjectsFromLocal();

      expect(subjects).toHaveLength(2);
      expect(subjects[0].name).toBe("수학");
      expect(subjects[1].name).toBe("영어");
    });
  });

  describe("Teachers CRUD", () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          students: [],
          subjects: [],
          sessions: [],
          enrollments: [],
          teachers: [
            { id: "teacher-1", name: "김강사", color: "#ff0000", userId: null, role: "member" },
          ],
          version: "1.0",
          lastModified: new Date().toISOString(),
        })
      );
    });

    it("강사를 성공적으로 추가해야 한다", () => {
      const result = addTeacherToLocal("이선생", "#0000ff", null);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("이선생");
      expect(result.data?.color).toBe("#0000ff");
    });

    it("role이 제공되지 않으면 기본값 member로 저장해야 한다", () => {
      const result = addTeacherToLocal("박선생", "#00ff00", null);

      expect(result.success).toBe(true);
      expect(result.data?.role).toBe("member");
    });

    it("중복 이름 강사 추가 시 에러를 반환해야 한다", () => {
      const result = addTeacherToLocal("김강사", "#ff0000", null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 같은 이름의 강사가 존재합니다.");
    });

    it("중복 이름(공백 포함) 강사 추가 시 에러를 반환해야 한다", () => {
      const result = addTeacherToLocal(" 김강사 ", "#ff0000", null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 같은 이름의 강사가 존재합니다.");
    });

    it("강사 수정 시 다른 강사와 중복 이름이면 에러를 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          students: [],
          subjects: [],
          sessions: [],
          enrollments: [],
          teachers: [
            { id: "teacher-1", name: "김강사", color: "#ff0000", userId: null, role: "member" },
            { id: "teacher-2", name: "이선생", color: "#0000ff", userId: null, role: "member" },
          ],
          version: "1.0",
          lastModified: new Date().toISOString(),
        })
      );

      const result = updateTeacherInLocal("teacher-2", { name: "김강사" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("이미 같은 이름의 강사가 존재합니다.");
    });
  });

  describe("에러 처리", () => {
    it("localStorage 접근 실패 시 기본값을 반환해야 한다", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage access denied");
      });

      const data = getClassPlannerData();

      expect(data).toMatchObject({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
      });
      expect(data.lastModified).toBeTruthy();
    });

    it("잘못된 JSON 데이터 시 기본값을 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue("invalid-json");

      const data = getClassPlannerData();

      expect(data).toMatchObject({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
      });
      expect(data.lastModified).toBeTruthy();
    });

    it("localStorage 저장 실패 시 false를 반환해야 한다", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const testData = {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        teachers: [],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };

      const result = setClassPlannerData(testData);

      expect(result).toBe(false);
    });
  });

  // ===== lastModified 기능 테스트 =====
  describe("lastModified 자동 갱신 테스트", () => {
    // 전역 beforeEach에서 storage를 초기화하므로 별도 설정 불필요

    it("학생 추가 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      const beforeTime = new Date().toISOString();

      const result = addStudentToLocal("홍길동");

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.lastModified).not.toBe("2025-01-01T00:00:00.000Z");
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("학생 수정 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      // 먼저 학생 추가
      const addResult = addStudentToLocal("홍길동");
      expect(addResult.success).toBe(true);

      const student = addResult.data;
      // 이후 호출부터는 실제 storage를 읽도록 복원
      localStorageMock.getItem.mockImplementation(
        (key: string) => storage[key] || null
      );
      const beforeTime = new Date().toISOString();

      const result = updateStudentInLocal(student!.id, { name: "김철수" });

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("학생 삭제 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      // 먼저 학생 추가
      const addResult = addStudentToLocal("홍길동");
      expect(addResult.success).toBe(true);

      const student = addResult.data;
      // 이후 호출부터는 실제 storage를 읽도록 복원
      localStorageMock.getItem.mockImplementation(
        (key: string) => storage[key] || null
      );
      const beforeTime = new Date().toISOString();

      const result = deleteStudentFromLocal(student!.id);

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("과목 추가 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      const beforeTime = new Date().toISOString();

      const result = addSubjectToLocal("과학", "#ff0000");

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("과목 수정 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      // 먼저 과목 추가
      const addResult = addSubjectToLocal("수학", "#ff0000");
      expect(addResult.success).toBe(true);

      const subject = addResult.data;
      // 이후 호출부터는 실제 storage를 읽도록 복원
      localStorageMock.getItem.mockImplementation(
        (key: string) => storage[key] || null
      );
      const beforeTime = new Date().toISOString();

      const result = updateSubjectInLocal(subject!.id, { name: "영어" });

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });

    it("과목 삭제 시 lastModified가 갱신되어야 함", () => {
      // localStorage 초기화
      localStorageMock.getItem.mockReturnValue(null);

      // 먼저 과목 추가
      const addResult = addSubjectToLocal("수학", "#ff0000");
      expect(addResult.success).toBe(true);

      const subject = addResult.data;
      // 이후 호출부터는 실제 storage를 읽도록 복원
      localStorageMock.getItem.mockImplementation(
        (key: string) => storage[key] || null
      );
      const beforeTime = new Date().toISOString();

      const result = deleteSubjectFromLocal(subject!.id);

      expect(result.success).toBe(true);

      // lastModified가 갱신되었는지 확인
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[1][1]);
      expect(new Date(savedData.lastModified).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime()
      );
    });
  });
});

// ===== 키 스코프 분리 테스트 =====

describe("getStorageKey / scoped storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("supabase_user_id 없으면 anonymous 키에 저장", () => {
    setClassPlannerData({
      students: [{ id: "s1", name: "Alice" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });
    expect(localStorageMock.getItem("classPlannerData:anonymous")).not.toBeNull();
    expect(localStorageMock.getItem("classPlannerData")).toBeNull();
  });

  it("supabase_user_id 있으면 user-scoped 키에 저장", () => {
    localStorageMock.setItem("supabase_user_id", "user-123");
    setClassPlannerData({
      students: [{ id: "s1", name: "Bob" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });
    expect(localStorageMock.getItem("classPlannerData:user-123")).not.toBeNull();
    expect(localStorageMock.getItem("classPlannerData:anonymous")).toBeNull();
  });

  it("clearClassPlannerData는 현재 스코프 키만 삭제", () => {
    localStorageMock.setItem("supabase_user_id", "user-123");
    storage["classPlannerData:user-123"] = '{"students":[],"subjects":[],"sessions":[],"enrollments":[],"version":"1.0","lastModified":"2025-01-01T00:00:00.000Z"}';
    storage["classPlannerData:anonymous"] = '{"students":[{"id":"a1","name":"Anon"}],"subjects":[],"sessions":[],"enrollments":[],"version":"1.0","lastModified":"2025-01-01T00:00:00.000Z"}';
    clearClassPlannerData();
    expect(localStorageMock.getItem("classPlannerData:user-123")).toBeNull();
    expect(localStorageMock.getItem("classPlannerData:anonymous")).not.toBeNull();
  });
});

describe("migrateUnkeyedStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("레거시 classPlannerData가 있으면 현재 스코프 키로 마이그레이션", () => {
    const legacyData = '{"students":[{"id":"s1","name":"Legacy"}],"subjects":[],"sessions":[],"enrollments":[],"version":"1.0","lastModified":"2025-01-01T00:00:00.000Z"}';
    storage["classPlannerData"] = legacyData;
    const result = getClassPlannerData();
    expect(result.students[0].name).toBe("Legacy");
    expect(localStorageMock.getItem("classPlannerData")).toBeNull();
    expect(localStorageMock.getItem("classPlannerData:anonymous")).not.toBeNull();
  });

  it("레거시 키 없으면 아무것도 안 함", () => {
    storage["classPlannerData:anonymous"] = '{"students":[],"subjects":[],"sessions":[],"enrollments":[],"version":"1.0","lastModified":"2025-01-01T00:00:00.000Z"}';
    getClassPlannerData();
    expect(localStorageMock.getItem("classPlannerData")).toBeNull();
  });

  it("로그인 사용자인 경우 user-scoped 키로 마이그레이션", () => {
    const legacyData = '{"students":[{"id":"s1","name":"LoggedInUser"}],"subjects":[],"sessions":[],"enrollments":[],"version":"1.0","lastModified":"2025-01-01T00:00:00.000Z"}';
    storage["classPlannerData"] = legacyData;
    localStorageMock.setItem("supabase_user_id", "user-789");
    const result = getClassPlannerData();
    expect(result.students[0].name).toBe("LoggedInUser");
    // 레거시 키 삭제
    expect(localStorageMock.getItem("classPlannerData")).toBeNull();
    // user-scoped 키로 이동
    expect(localStorageMock.getItem("classPlannerData:user-789")).not.toBeNull();
    // anonymous 키에는 저장 안 됨
    expect(localStorageMock.getItem("classPlannerData:anonymous")).toBeNull();
  });
});

describe("clearUserClassPlannerData", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("명시적 userId의 스코프 키 삭제", () => {
    storage["classPlannerData:user-456"] = '{"students":[]}';
    storage["classPlannerData:anonymous"] = '{"students":[{"id":"a1","name":"Anon"}]}';
    clearUserClassPlannerData("user-456");
    expect(localStorageMock.getItem("classPlannerData:user-456")).toBeNull();
    expect(localStorageMock.getItem("classPlannerData:anonymous")).not.toBeNull();
  });
});

// ===== Active academy management =====

describe("active academy management", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("active academy를 설정하고 조회할 수 있다", () => {
    setActiveAcademyId("user-1", "academy-abc");
    expect(getActiveAcademyId("user-1")).toBe("academy-abc");
  });

  it("active academy를 초기화하면 null 반환", () => {
    setActiveAcademyId("user-1", "academy-abc");
    clearActiveAcademy("user-1");
    expect(getActiveAcademyId("user-1")).toBeNull();
  });

  it("사용자별 active academy가 격리된다", () => {
    setActiveAcademyId("user-1", "academy-a");
    setActiveAcademyId("user-2", "academy-b");
    expect(getActiveAcademyId("user-1")).toBe("academy-a");
    expect(getActiveAcademyId("user-2")).toBe("academy-b");
  });

  it("설정하지 않은 userId는 null 반환", () => {
    expect(getActiveAcademyId("user-never-set")).toBeNull();
  });
});

// ===== getStorageKey with academyId =====

describe("getStorageKey per-academy scoping", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("academyId 포함 시 userId:academyId 스코프 키에 저장", () => {
    storage["supabase_user_id"] = "user-123";
    setActiveAcademyId("user-123", "acad-xyz");
    setClassPlannerData(
      {
        students: [{ id: "s1", name: "Test" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        teachers: [],
        version: "1.0",
        lastModified: new Date().toISOString(),
      },
      "acad-xyz"
    );
    expect(
      localStorageMock.getItem("classPlannerData:user-123:acad-xyz")
    ).not.toBeNull();
    // 기존 user-scoped 키에는 저장 안 됨
    expect(localStorageMock.getItem("classPlannerData:user-123")).toBeNull();
  });

  it("academyId 없으면 active academy 키로 자동 라우팅", () => {
    storage["supabase_user_id"] = "user-123";
    setActiveAcademyId("user-123", "acad-xyz");
    // active academy가 설정된 상태에서 academyId 미전달
    setClassPlannerData({
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });
    // active academy 기반 키로 저장됨
    expect(
      localStorageMock.getItem("classPlannerData:user-123:acad-xyz")
    ).not.toBeNull();
  });

  it("userId 없으면 academyId가 있어도 anonymous 키에 저장", () => {
    // supabase_user_id 없음
    setClassPlannerData(
      {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        teachers: [],
        version: "1.0",
        lastModified: new Date().toISOString(),
      },
      "some-academy"
    );
    expect(
      localStorageMock.getItem(ANONYMOUS_STORAGE_KEY)
    ).not.toBeNull();
  });
});

// ===== One-time migration: legacy key → academy-scoped key =====

describe("getClassPlannerData per-academy migration", () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it("새 스코프 키가 비어있고 레거시 키에 데이터가 있으면 첫 조회 시 복사", () => {
    const legacyData = JSON.stringify({
      students: [{ id: "s1", name: "LegacyStudent" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });
    storage["supabase_user_id"] = "user-111";
    storage["classPlannerData:user-111"] = legacyData;

    const result = getClassPlannerData("academy-new");

    expect(result.students[0].name).toBe("LegacyStudent");
    // 새 스코프 키에 복사됨
    expect(
      localStorageMock.getItem("classPlannerData:user-111:academy-new")
    ).not.toBeNull();
    // 레거시 키는 삭제 안 됨 (안전한 롤백)
    expect(
      localStorageMock.getItem("classPlannerData:user-111")
    ).not.toBeNull();
  });

  it("새 스코프 키에 이미 데이터가 있으면 레거시 데이터를 덮어쓰지 않는다", () => {
    storage["supabase_user_id"] = "user-111";
    storage["classPlannerData:user-111"] = JSON.stringify({
      students: [{ id: "s-legacy", name: "LegacyStudent" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });
    storage["classPlannerData:user-111:academy-new"] = JSON.stringify({
      students: [{ id: "s-new", name: "NewStudent" }],
      subjects: [],
      sessions: [],
      enrollments: [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    });

    const result = getClassPlannerData("academy-new");

    // 기존 새 스코프 데이터 유지
    expect(result.students[0].name).toBe("NewStudent");
  });

  it("userId 없이 academyId만 넘겨도 마이그레이션 없이 anonymous 기본값 반환", () => {
    // no supabase_user_id in storage
    const result = getClassPlannerData("academy-orphan");
    expect(result.students).toHaveLength(0);
    // anonymous 키에만 접근
    expect(
      localStorageMock.getItem("classPlannerData:academy-orphan")
    ).toBeNull();
  });
});
