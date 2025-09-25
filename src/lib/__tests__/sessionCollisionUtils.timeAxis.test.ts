import { describe, expect, it } from "vitest";
import type { Enrollment, Session, Subject } from "../planner";
import {
  isTimeOverlapping,
  repositionSessions,
} from "../sessionCollisionUtils";

const sub = (id: string, name: string): Subject => ({
  id,
  name,
  color: "#000",
});

const enr = (id: string, studentId: string, subjectId: string): Enrollment => ({
  id,
  studentId,
  subjectId,
});

describe("시간축 관련 테스트", () => {
  describe("isTimeOverlapping", () => {
    it("겹치는 시간을 정확히 감지해야 한다", () => {
      // 완전히 겹치는 경우
      expect(isTimeOverlapping("10:00", "11:00", "10:00", "11:00")).toBe(true);

      // 부분적으로 겹치는 경우
      expect(isTimeOverlapping("10:00", "11:00", "10:30", "11:30")).toBe(true);
      expect(isTimeOverlapping("10:30", "11:30", "10:00", "11:00")).toBe(true);

      // 한 세션이 다른 세션을 완전히 포함하는 경우
      expect(isTimeOverlapping("09:00", "12:00", "10:00", "11:00")).toBe(true);
      expect(isTimeOverlapping("10:00", "11:00", "09:00", "12:00")).toBe(true);
    });

    it("겹치지 않는 시간을 정확히 감지해야 한다", () => {
      // 연속된 시간 (끝과 시작이 같은 경우)
      expect(isTimeOverlapping("10:00", "11:00", "11:00", "12:00")).toBe(false);

      // 완전히 분리된 시간
      expect(isTimeOverlapping("10:00", "11:00", "12:00", "13:00")).toBe(false);
      expect(isTimeOverlapping("12:00", "13:00", "10:00", "11:00")).toBe(false);
    });

    it("경계 케이스를 정확히 처리해야 한다", () => {
      // 1분 차이로 겹치지 않는 경우
      expect(isTimeOverlapping("10:00", "10:59", "11:00", "12:00")).toBe(false);

      // 1분 차이로 겹치는 경우
      expect(isTimeOverlapping("10:00", "11:00", "10:59", "12:00")).toBe(true);
    });
  });

  describe("시간축 충돌 해결", () => {
    it("같은 시간대에 여러 세션이 있을 때 순차적으로 배치되어야 한다", () => {
      const subjects: Subject[] = [
        sub("sub1", "수학"),
        sub("sub2", "영어"),
        sub("sub3", "과학"),
      ];
      const enrollments: Enrollment[] = [
        enr("e1", "s1", "sub1"),
        enr("e2", "s2", "sub2"),
        enr("e3", "s3", "sub3"),
      ];

      const sessions: Session[] = [
        {
          id: "math",
          weekday: 0,
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english",
          weekday: 0,
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 2,
          enrollmentIds: ["e2"],
          room: "",
        },
      ];

      // 수학 세션을 같은 시간대로 이동 (영어와 충돌)
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        0,
        "10:00",
        "11:00",
        1,
        "math"
      );

      const byId = Object.fromEntries(result.map((s) => [s.id, s]));
      expect(byId["math"].yPosition).toBe(1);
      expect(byId["english"].yPosition).toBe(2); // 영어가 밀려남
    });

    it("시간 연장 시 연쇄적으로 세션들이 밀려나야 한다", () => {
      const subjects: Subject[] = [
        sub("sub1", "수학"),
        sub("sub2", "영어"),
        sub("sub3", "과학"),
      ];
      const enrollments: Enrollment[] = [
        enr("e1", "s1", "sub1"),
        enr("e2", "s2", "sub2"),
        enr("e3", "s3", "sub3"),
      ];

      const sessions: Session[] = [
        {
          id: "math",
          weekday: 0,
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english",
          weekday: 0,
          startsAt: "11:00",
          endsAt: "12:00",
          yPosition: 1,
          enrollmentIds: ["e2"],
          room: "",
        },
        {
          id: "science",
          weekday: 0,
          startsAt: "12:00",
          endsAt: "13:00",
          yPosition: 1,
          enrollmentIds: ["e3"],
          room: "",
        },
      ];

      // 수학 세션을 10:00-12:00으로 연장 (영어와 과학과 충돌)
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        0,
        "10:00",
        "12:00",
        1,
        "math"
      );

      const byId = Object.fromEntries(result.map((s) => [s.id, s]));
      expect(byId["math"].yPosition).toBe(1);
      expect(byId["math"].endsAt).toBe("12:00");
      expect(byId["english"].yPosition).toBe(2); // 영어가 밀려남
      expect(byId["science"].yPosition).toBe(1); // 과학은 겹치지 않아서 그대로 유지됨
    });

    it("시간 단축 시 다른 세션들의 위치가 조정되어야 한다", () => {
      const subjects: Subject[] = [sub("sub1", "수학"), sub("sub2", "영어")];
      const enrollments: Enrollment[] = [
        enr("e1", "s1", "sub1"),
        enr("e2", "s2", "sub2"),
      ];

      const sessions: Session[] = [
        {
          id: "math",
          weekday: 0,
          startsAt: "10:00",
          endsAt: "12:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english",
          weekday: 0,
          startsAt: "11:00",
          endsAt: "13:00",
          yPosition: 2,
          enrollmentIds: ["e2"],
          room: "",
        },
      ];

      // 수학 세션을 10:00-11:00으로 단축
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        0,
        "10:00",
        "11:00",
        1,
        "math"
      );

      const byId = Object.fromEntries(result.map((s) => [s.id, s]));
      expect(byId["math"].yPosition).toBe(1);
      expect(byId["math"].endsAt).toBe("11:00");
      expect(byId["english"].yPosition).toBe(2); // 영어는 그대로 유지
    });
  });
});
