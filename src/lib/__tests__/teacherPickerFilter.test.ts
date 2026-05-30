import { describe, it, expect } from "vitest";
import {
  isAdminRole,
  filterTeachersForPicker,
  type TeacherWithRole,
} from "../teacherPickerFilter";

describe("isAdminRole", () => {
  it("admin/owner는 true, member/null/undefined는 false", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("member")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("unknown")).toBe(false);
  });
});

describe("filterTeachersForPicker", () => {
  const teachers: TeacherWithRole[] = [
    { id: "t1", role: "member" },
    { id: "t2", role: "admin" },
    { id: "t3", role: "owner" },
    { id: "t4", role: null },
    { id: "t5", role: "member" },
  ];

  it("기본: 모든 teachers 반환 (의도 정정 2026-05-26 — badge 으로 시각 구분)", () => {
    const result = filterTeachersForPicker(teachers);
    expect(result.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("selected 인자 무관 — 모든 teachers 반환", () => {
    const result = filterTeachersForPicker(teachers, "t2");
    expect(result.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("selected array 도 모든 teachers 반환", () => {
    const result = filterTeachersForPicker(teachers, ["t2", "t3"]);
    expect(result.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("selected=null이면 기본 동작", () => {
    const result = filterTeachersForPicker(teachers, null);
    expect(result.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("teachers가 비어있으면 빈 배열", () => {
    expect(filterTeachersForPicker([])).toEqual([]);
  });
});
