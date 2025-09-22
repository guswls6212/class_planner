/**
 * localStorage CRUD 유틸리티 테스트
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addStudentToLocal,
  addSubjectToLocal,
  clearClassPlannerData,
  deleteStudentFromLocal,
  deleteSubjectFromLocal,
  getAllStudentsFromLocal,
  getAllSubjectsFromLocal,
  getClassPlannerData,
  getStudentFromLocal,
  getSubjectFromLocal,
  setClassPlannerData,
  updateStudentInLocal,
  updateSubjectInLocal,
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
        version: "1.0",
        lastModified: new Date().toISOString(),
      };

      const result = setClassPlannerData(testData);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "classPlannerData",
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
        "classPlannerData"
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
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initial));

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
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initial));

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
