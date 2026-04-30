import { describe, it, expect } from "vitest";
import { migrateLocalSessionsIfNeeded } from "../migrateLocalSessions";

describe("migrateLocalSessionsIfNeeded", () => {
  it("weekStartDate 없는 session에 현재 주 자동 부여", () => {
    const data = { sessions: [{ id: "s1", weekday: 0, startsAt: "10:00", endsAt: "11:00" }] };
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect((migrated.sessions[0] as any).weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("이미 weekStartDate 있는 session은 그대로 유지", () => {
    const data = { sessions: [{ id: "s1", weekStartDate: "2026-01-05", weekday: 0, startsAt: "10:00", endsAt: "11:00" }] };
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect(migrated.sessions[0].weekStartDate).toBe("2026-01-05");
  });

  it("sessions 배열이 없으면 그대로 반환", () => {
    const data = { students: [], subjects: [] } as any;
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect(migrated).toEqual(data);
  });

  it("빈 sessions 배열은 그대로 반환", () => {
    const data = { sessions: [] };
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect(migrated.sessions).toHaveLength(0);
  });
});
