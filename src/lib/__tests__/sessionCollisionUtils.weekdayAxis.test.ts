import { describe, expect, it } from "vitest";
import type { Enrollment, Session, Subject } from "../planner";
import { repositionSessions } from "../sessionCollisionUtils";

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

describe("요일축 관련 테스트", () => {
  describe("교차 요일 이동", () => {
    it("월요일에서 화요일로 세션을 이동할 때 정상적으로 처리되어야 한다", () => {
      const subjects: Subject[] = [sub("sub1", "수학")];
      const enrollments: Enrollment[] = [enr("e1", "s1", "sub1")];

      const sessions: Session[] = [
        {
          id: "math-monday",
          weekday: 0, // 월요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
      ];

      // 월요일 세션을 화요일로 이동
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        1, // 화요일
        "10:00",
        "11:00",
        1,
        "math-monday"
      );

      expect(result).toHaveLength(1);
      expect(result[0].weekday).toBe(1); // 화요일
      expect(result[0].yPosition).toBe(1);
      expect(result[0].startsAt).toBe("10:00");
      expect(result[0].endsAt).toBe("11:00");
    });

    it("여러 요일에 세션이 있을 때 특정 요일의 세션만 이동되어야 한다", () => {
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
          id: "math-monday",
          weekday: 0, // 월요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english-tuesday",
          weekday: 1, // 화요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e2"],
          room: "",
        },
        {
          id: "science-wednesday",
          weekday: 2, // 수요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e3"],
          room: "",
        },
      ];

      // 화요일 영어 세션을 목요일로 이동
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        3, // 목요일
        "10:00",
        "11:00",
        1,
        "english-tuesday"
      );

      const byId = Object.fromEntries(result.map((s) => [s.id, s]));

      // 월요일 수학 세션은 그대로 유지
      expect(byId["math-monday"].weekday).toBe(0);
      expect(byId["math-monday"].yPosition).toBe(1);

      // 화요일 영어 세션은 목요일로 이동
      expect(byId["english-tuesday"].weekday).toBe(3);
      expect(byId["english-tuesday"].yPosition).toBe(1);

      // 수요일 과학 세션은 그대로 유지
      expect(byId["science-wednesday"].weekday).toBe(2);
      expect(byId["science-wednesday"].yPosition).toBe(1);
    });

    it("원래 요일에서 세션이 제거된 후 yPosition이 압축되어야 한다", () => {
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
          id: "math-tuesday",
          weekday: 1, // 화요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english-tuesday",
          weekday: 1, // 화요일
          startsAt: "11:00",
          endsAt: "12:00",
          yPosition: 2,
          enrollmentIds: ["e2"],
          room: "",
        },
        {
          id: "science-tuesday",
          weekday: 1, // 화요일
          startsAt: "12:00",
          endsAt: "13:00",
          yPosition: 3,
          enrollmentIds: ["e3"],
          room: "",
        },
      ];

      // 화요일 수학 세션을 수요일로 이동
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        2, // 수요일
        "10:00",
        "11:00",
        1,
        "math-tuesday"
      );

      const tuesdaySessions = result.filter((s) => s.weekday === 1);
      const wednesdaySessions = result.filter((s) => s.weekday === 2);

      // 화요일에는 영어와 과학만 남고 yPosition이 압축됨
      expect(tuesdaySessions).toHaveLength(2);
      expect(
        tuesdaySessions.find((s) => s.id === "english-tuesday")?.yPosition
      ).toBe(1);
      expect(
        tuesdaySessions.find((s) => s.id === "science-tuesday")?.yPosition
      ).toBe(2);

      // 수요일에는 수학 세션이 이동됨
      expect(wednesdaySessions).toHaveLength(1);
      expect(wednesdaySessions[0].id).toBe("math-tuesday");
      expect(wednesdaySessions[0].yPosition).toBe(1);
    });
  });

  describe("요일별 충돌 해결", () => {
    it("같은 요일 내에서 여러 세션이 충돌할 때 순차적으로 배치되어야 한다", () => {
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
          weekday: 1, // 화요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english",
          weekday: 1, // 화요일
          startsAt: "10:30",
          endsAt: "11:30",
          yPosition: 2,
          enrollmentIds: ["e2"],
          room: "",
        },
        {
          id: "science",
          weekday: 1, // 화요일
          startsAt: "11:00",
          endsAt: "12:00",
          yPosition: 3,
          enrollmentIds: ["e3"],
          room: "",
        },
      ];

      // 수학 세션을 10:00-12:00으로 연장 (영어와 과학과 충돌)
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        1, // 화요일
        "10:00",
        "12:00",
        1,
        "math"
      );

      const tuesdaySessions = result.filter((s) => s.weekday === 1);
      const byId = Object.fromEntries(tuesdaySessions.map((s) => [s.id, s]));

      expect(byId["math"].yPosition).toBe(1);
      expect(byId["math"].endsAt).toBe("12:00");
      expect(byId["english"].yPosition).toBe(2); // 영어가 밀려남
      expect(byId["science"].yPosition).toBe(3); // 과학도 밀려남
    });

    it("요일별로 독립적으로 충돌이 해결되어야 한다", () => {
      const subjects: Subject[] = [sub("sub1", "수학"), sub("sub2", "영어")];
      const enrollments: Enrollment[] = [
        enr("e1", "s1", "sub1"),
        enr("e2", "s2", "sub2"),
      ];

      const sessions: Session[] = [
        {
          id: "math-monday",
          weekday: 0, // 월요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "math-tuesday",
          weekday: 1, // 화요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
        {
          id: "english-tuesday",
          weekday: 1, // 화요일
          startsAt: "10:30",
          endsAt: "11:30",
          yPosition: 2,
          enrollmentIds: ["e2"],
          room: "",
        },
      ];

      // 화요일 수학 세션을 10:00-12:00으로 연장 (화요일 영어와만 충돌)
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        1, // 화요일
        "10:00",
        "12:00",
        1,
        "math-tuesday"
      );

      const mondaySessions = result.filter((s) => s.weekday === 0);
      const tuesdaySessions = result.filter((s) => s.weekday === 1);

      // 월요일 세션은 영향받지 않음
      expect(mondaySessions).toHaveLength(1);
      expect(mondaySessions[0].yPosition).toBe(1);

      // 화요일 세션들만 충돌 해결됨
      expect(tuesdaySessions).toHaveLength(2);
      const byId = Object.fromEntries(tuesdaySessions.map((s) => [s.id, s]));
      expect(byId["math-tuesday"].yPosition).toBe(1);
      expect(byId["english-tuesday"].yPosition).toBe(2);
    });
  });

  describe("요일 경계 처리", () => {
    it("주말(토요일, 일요일) 세션도 정상적으로 처리되어야 한다", () => {
      const subjects: Subject[] = [sub("sub1", "수학")];
      const enrollments: Enrollment[] = [enr("e1", "s1", "sub1")];

      const sessions: Session[] = [
        {
          id: "math-saturday",
          weekday: 5, // 토요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
      ];

      // 토요일 세션을 일요일로 이동
      const result = repositionSessions(
        sessions,
        enrollments,
        subjects,
        6, // 일요일
        "10:00",
        "11:00",
        1,
        "math-saturday"
      );

      expect(result).toHaveLength(1);
      expect(result[0].weekday).toBe(6); // 일요일
      expect(result[0].yPosition).toBe(1);
    });

    it("요일 인덱스가 범위를 벗어나지 않아야 한다", () => {
      const subjects: Subject[] = [sub("sub1", "수학")];
      const enrollments: Enrollment[] = [enr("e1", "s1", "sub1")];

      const sessions: Session[] = [
        {
          id: "math",
          weekday: 0, // 월요일
          startsAt: "10:00",
          endsAt: "11:00",
          yPosition: 1,
          enrollmentIds: ["e1"],
          room: "",
        },
      ];

      // 유효한 요일 범위 내에서 이동
      const validWeekdays = [0, 1, 2, 3, 4, 5, 6]; // 월~일

      validWeekdays.forEach((weekday) => {
        const result = repositionSessions(
          sessions,
          enrollments,
          subjects,
          weekday,
          "10:00",
          "11:00",
          1,
          "math"
        );

        expect(result).toHaveLength(1);
        expect(result[0].weekday).toBe(weekday);
        expect(result[0].yPosition).toBe(1);
      });
    });
  });
});
