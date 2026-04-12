import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkLoginDataConflict,
  applyServerChoice,
  applyLocalDataChoice,
} from "../handleLoginDataMigration";
import type { ClassPlannerData } from "../../localStorageCrud";

// Mock localStorage
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach((k) => delete storage[k]); }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

vi.mock("../../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../apiSync", () => ({
  syncStudentCreate: vi.fn(),
  syncSubjectCreate: vi.fn(),
}));

const emptyData: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const serverData: ClassPlannerData = {
  students: [{ id: "server-s1", name: "Server Student" }],
  subjects: [{ id: "server-sub1", name: "서버 과목", color: "#ff0000" }],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const localData: ClassPlannerData = {
  students: [{ id: "anon-s1", name: "Anonymous Student" }],
  subjects: [{ id: "anon-sub1", name: "익명 과목", color: "#00ff00" }],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

describe("checkLoginDataConflict", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("anonymous 데이터 없으면 use-server", () => {
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anonymous 데이터가 비어있으면 use-server", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(emptyData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("use-server");
  });

  it("anonymous 데이터 있고 서버 비어있으면 upload-local", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(emptyData);
    expect(result.action).toBe("upload-local");
  });

  it("anonymous 데이터 있고 서버도 있으면 conflict", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    const result = checkLoginDataConflict(serverData);
    expect(result.action).toBe("conflict");
    if (result.action === "conflict") {
      expect(result.localData.students[0].name).toBe("Anonymous Student");
      expect(result.serverData.students[0].name).toBe("Server Student");
    }
  });
});

describe("applyServerChoice", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("anonymous 키 삭제", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    applyServerChoice();
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
  });
});

describe("applyLocalDataChoice", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("anonymous 데이터를 user-scoped 키로 복사 후 anonymous 삭제", () => {
    storage["classPlannerData:anonymous"] = JSON.stringify(localData);
    applyLocalDataChoice("user-999");
    expect(storage["classPlannerData:user-999"]).toBe(JSON.stringify(localData));
    expect(storage["classPlannerData:anonymous"]).toBeUndefined();
  });

  it("anonymous 데이터 없으면 아무것도 안 함", () => {
    applyLocalDataChoice("user-999");
    expect(storage["classPlannerData:user-999"]).toBeUndefined();
  });
});
