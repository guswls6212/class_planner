import { describe, it, expect } from "vitest";
import { computeAttendanceDot } from "../SessionBlock.attendanceDot";

const ids = ["s1", "s2", "s3"];

describe("computeAttendanceDot", () => {
  describe("수업 전 (upcoming)", () => {
    it("dot null 반환 — 전부 미체크", () => {
      expect(computeAttendanceDot("upcoming", {}, ids)).toBeNull();
    });
    it("dot null 반환 — 전원 체크되어도", () => {
      expect(
        computeAttendanceDot(
          "upcoming",
          { s1: { status: "present" }, s2: { status: "present" }, s3: { status: "present" } },
          ids
        )
      ).toBeNull();
    });
  });

  describe("진행 중 (in-progress)", () => {
    it("미체크 / 부분 → null (alert X — 부분 체크 OK)", () => {
      expect(computeAttendanceDot("in-progress", {}, ids)).toBeNull();
      expect(
        computeAttendanceDot("in-progress", { s1: { status: "present" } }, ids)
      ).toBeNull();
    });
    it("전원 출석 → emerald (결석/지각 X)", () => {
      const r = computeAttendanceDot(
        "in-progress",
        {
          s1: { status: "present" },
          s2: { status: "present" },
          s3: { status: "present" },
        },
        ids
      );
      expect(r).toEqual({
        color: "bg-emerald-400",
        pulse: false,
        title: "전원 출석 완료",
      });
    });
    it("전원 체크 + 결석 1 → amber", () => {
      const r = computeAttendanceDot(
        "in-progress",
        {
          s1: { status: "present" },
          s2: { status: "absent" },
          s3: { status: "present" },
        },
        ids
      );
      expect(r?.color).toBe("bg-amber-400");
      expect(r?.pulse).toBe(false);
    });
    it("전원 체크 + 지각 1 → amber", () => {
      const r = computeAttendanceDot(
        "in-progress",
        {
          s1: { status: "late" },
          s2: { status: "present" },
          s3: { status: "present" },
        },
        ids
      );
      expect(r?.color).toBe("bg-amber-400");
    });
  });

  describe("종료 후 (completed)", () => {
    it("전부 미체크 → red + pulse + '체크 누락' title", () => {
      const r = computeAttendanceDot("completed", {}, ids);
      expect(r?.color).toBe("bg-red-400");
      expect(r?.pulse).toBe(true);
      expect(r?.title).toContain("누락");
    });
    it("부분 체크 → red + pulse + 미체크 수 title", () => {
      const r = computeAttendanceDot(
        "completed",
        { s1: { status: "present" } },
        ids
      );
      expect(r?.color).toBe("bg-red-400");
      expect(r?.pulse).toBe(true);
      expect(r?.title).toContain("2명 미체크");
    });
    it("전원 출석 → emerald + pulse X", () => {
      const r = computeAttendanceDot(
        "completed",
        {
          s1: { status: "present" },
          s2: { status: "present" },
          s3: { status: "present" },
        },
        ids
      );
      expect(r?.color).toBe("bg-emerald-400");
      expect(r?.pulse).toBe(false);
    });
    it("전원 체크 + 결석 포함 → amber + pulse X", () => {
      const r = computeAttendanceDot(
        "completed",
        {
          s1: { status: "present" },
          s2: { status: "absent" },
          s3: { status: "excused" },
        },
        ids
      );
      expect(r?.color).toBe("bg-amber-400");
      expect(r?.pulse).toBe(false);
    });
  });

  describe("edge case", () => {
    it("학생 0명 → null", () => {
      expect(computeAttendanceDot("completed", {}, [])).toBeNull();
    });
    it("status='none' 은 미체크로 처리", () => {
      const r = computeAttendanceDot(
        "completed",
        { s1: { status: "none" }, s2: { status: "none" }, s3: { status: "none" } },
        ids
      );
      expect(r?.color).toBe("bg-red-400");
    });
    it("status='excused' 는 체크된 것 (결석 group 아님)", () => {
      // excused 는 사유 — present 와 동등하게 "출석한 것처럼" 처리. 결석/지각 amber 분류 X.
      const r = computeAttendanceDot(
        "completed",
        {
          s1: { status: "excused" },
          s2: { status: "excused" },
          s3: { status: "excused" },
        },
        ids
      );
      expect(r?.color).toBe("bg-emerald-400");
    });
  });
});
