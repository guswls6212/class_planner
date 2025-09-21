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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
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
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    mockDispatchEvent.mockClear();
  });

  describe("기본 데이터 조작", () => {
    it("빈 데이터에서 기본값을 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const data = getClassPlannerData();

      expect(data).toEqual({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      });
    });

    it("데이터를 성공적으로 저장해야 한다", () => {
      const testData = {
        students: [{ id: "test-1", name: "김철수" }],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T15:00:00.000+09:00",
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
          subjects: [],
          sessions: [],
          enrollments: [],
          version: "1.0",
          lastModified: "2025-09-21T15:00:00.000+09:00",
        })
      );
    });

    it("학생을 성공적으로 추가해야 한다", () => {
      const result = addStudentToLocal("박민수");

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: expect.stringContaining("test-uuid-"),
        name: "박민수",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
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
          lastModified: "2025-09-21T15:00:00.000+09:00",
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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
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

      expect(data).toEqual({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      });
    });

    it("잘못된 JSON 데이터 시 기본값을 반환해야 한다", () => {
      localStorageMock.getItem.mockReturnValue("invalid-json");

      const data = getClassPlannerData();

      expect(data).toEqual({
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
        lastModified: "2025-09-21T16:00:00.000+09:00",
      });
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
        lastModified: "2025-09-21T16:00:00.000+09:00",
      };

      const result = setClassPlannerData(testData);

      expect(result).toBe(false);
    });
  });
});
