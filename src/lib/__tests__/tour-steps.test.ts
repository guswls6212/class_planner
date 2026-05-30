import { describe, it, expect } from "vitest";
import {
  CORE_STEPS,
  LOGIN_STEPS,
  getTourStepsForRole,
} from "../tour-steps";

describe("getTourStepsForRole", () => {
  it("anonymous (role null) → owner 가정 → CORE 의 owner visible 만 (6 step, export-admin 포함)", () => {
    const steps = getTourStepsForRole(false, null);
    expect(steps).toHaveLength(6);
    expect(steps.every((s) => s.segment === "core")).toBe(true);
    expect(steps.some((s) => s.id === "export-admin")).toBe(true);
    expect(steps.some((s) => s.id === "export-teacher")).toBe(false);
  });

  it("owner login → 13 step (CORE 6 owner + LOGIN 7, parent-code 포함)", () => {
    const steps = getTourStepsForRole(true, "owner");
    expect(steps).toHaveLength(13);
    expect(steps.some((s) => s.id === "academy-info")).toBe(true);
    expect(steps.some((s) => s.id === "parent-code")).toBe(true);
    expect(steps.some((s) => s.id === "export-admin")).toBe(true);
    expect(steps.some((s) => s.id === "export-teacher")).toBe(false);
  });

  it("admin login → 12 step (academy-info 제외, parent-code 포함)", () => {
    const steps = getTourStepsForRole(true, "admin");
    expect(steps).toHaveLength(12);
    expect(steps.some((s) => s.id === "academy-info")).toBe(false);
    expect(steps.some((s) => s.id === "teacher-invite")).toBe(true);
    expect(steps.some((s) => s.id === "parent-code")).toBe(true);
    expect(steps.some((s) => s.id === "export-admin")).toBe(true);
  });

  it("member (teacher) login → 3 step (export-teacher + academy-switch + attendance)", () => {
    const steps = getTourStepsForRole(true, "member");
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.id)).toEqual([
      "export-teacher",
      "academy-switch",
      "attendance",
    ]);
  });

  it("member anonymous → CORE 의 member visible 만 (export-teacher)", () => {
    const steps = getTourStepsForRole(false, "member");
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("export-teacher");
  });

  it("admin anonymous → CORE 의 admin visible (6 step, export-admin)", () => {
    const steps = getTourStepsForRole(false, "admin");
    expect(steps).toHaveLength(6);
    expect(steps.some((s) => s.id === "export-admin")).toBe(true);
    expect(steps.some((s) => s.segment === "login")).toBe(false);
  });

  it("roles undefined step 은 모든 role 에게 노출 (academy-switch / attendance)", () => {
    const academySwitch = LOGIN_STEPS.find((s) => s.id === "academy-switch");
    const attendance = LOGIN_STEPS.find((s) => s.id === "attendance");
    expect(academySwitch?.roles).toBeUndefined();
    expect(attendance?.roles).toBeUndefined();
  });

  it("CORE 의 export step 이 2 개로 분리됨 (admin + teacher)", () => {
    const exportSteps = CORE_STEPS.filter((s) => s.id.startsWith("export-"));
    expect(exportSteps).toHaveLength(2);
    expect(exportSteps[0].id).toBe("export-admin");
    expect(exportSteps[0].targetPath).toBe("/schedule");
    expect(exportSteps[1].id).toBe("export-teacher");
    expect(exportSteps[1].targetPath).toBe("/schedule");
  });
});
