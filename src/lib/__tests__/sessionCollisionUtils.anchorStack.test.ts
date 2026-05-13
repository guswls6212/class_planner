import { describe, expect, it } from "vitest";
import type { Enrollment, Session, Subject } from "../planner";
import { repositionSessions } from "../sessionCollisionUtils";

/**
 * Regression guard for omni-radar 2026-05-13 사고:
 *
 * 화요일에 1번~4번 학생이 10:00-11:00 lane 1~4 점유 + 5번 학생이 같은 요일 lane 1
 * 의 12:00-13:00 점유. 사용자가 5번을 1번/2번 사이 (lane 2) 로 드래그 → preview/drop
 * 모두 1번과 5번이 같은 yPosition 으로 stack (UI 엔 5번만 보임, payload 엔 둘 다).
 *
 * Root cause: isMovingToHigherLane 분기 (1→2 이동) 가 첫 충돌 세션 (2번) 을
 * sourceYPos (=1) 로 보냄 → 그 lane 의 1번이랑 또 충돌 → chain 이 anchor (lane 2)
 * 까지 propagate 해서 anchor 위에 1번 잔류 → movingSession 5번 push 시 stack.
 *
 * Fix: sourceYPos 가 시간 겹침 세션으로 이미 점유되어 있으면 그쪽 redirect 무효 →
 * 단순 propagate+1 chain 으로 fallback.
 */

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
const session = (
  id: string,
  yPosition: number,
  startsAt: string,
  endsAt: string,
  enrollmentIds: string[],
): Session => ({
  id,
  weekday: 1, // 화
  startsAt,
  endsAt,
  yPosition,
  enrollmentIds,
  room: "",
  weekStartDate: "",
});

describe("repositionSessions — anchor stack 회귀 가드 (omni-radar 2026-05-13)", () => {
  const subjects: Subject[] = [
    sub("sub-math-h", "고등수학"),
    sub("sub-math-m", "중등수학"),
    sub("sub-kor-h", "고등국어"),
    sub("sub-eng-m", "중등영어"),
    sub("sub-eng-h", "고등영어"),
  ];
  const enrollments: Enrollment[] = [
    enr("e1", "s1", "sub-math-h"),
    enr("e2", "s2", "sub-math-m"),
    enr("e3", "s3", "sub-kor-h"),
    enr("e4", "s4", "sub-eng-m"),
    enr("e5", "s5", "sub-eng-h"),
  ];
  // 화요일 layout: 1번~4번 lane 1~4 동시간, 5번 lane 1 다른 시간
  const baseSessions: Session[] = [
    session("s1", 1, "10:00", "11:00", ["e1"]), // 1번 고등수학 lane 1
    session("s2", 2, "10:00", "11:00", ["e2"]), // 2번 중등수학 lane 2
    session("s3", 3, "10:00", "11:00", ["e3"]), // 3번 고등국어 lane 3
    session("s4", 4, "10:00", "11:00", ["e4"]), // 4번 중등영어 lane 4
    session("s5", 1, "12:00", "13:00", ["e5"]), // 5번 고등영어 lane 1 (다른 시간)
  ];

  it("5번을 lane 2 (1번-2번 사이) 로 이동 시 같은 lane stack 없이 깨끗하게 끼워넣어진다", () => {
    const result = repositionSessions(
      baseSessions,
      enrollments,
      subjects,
      1, // 화요일
      "10:00",
      "11:00",
      2, // target lane = 2
      "s5", // 5번 이동
    );

    // 같은 요일에서 동시간(10:00-11:00) lane 별 카운트 검증
    const sameTime = result.filter(
      (s) => s.weekday === 1 && s.startsAt === "10:00" && s.endsAt === "11:00",
    );
    expect(sameTime).toHaveLength(5); // 1, 2, 3, 4, 5번 모두 10:00-11:00

    const byLane = new Map<number, string[]>();
    for (const s of sameTime) {
      const y = s.yPosition ?? 1;
      if (!byLane.has(y)) byLane.set(y, []);
      byLane.get(y)!.push(s.id);
    }
    // 각 lane 마다 정확히 1개씩 — stack 회피
    for (const [yPos, ids] of byLane) {
      expect(
        ids.length,
        `lane ${yPos} 에 ${ids.length}개 세션 stack: ${ids.join(",")}`,
      ).toBe(1);
    }
    // lane 5개 모두 점유
    expect([...byLane.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

    // 5번이 target lane 2 에 정착
    const s5 = result.find((s) => s.id === "s5");
    expect(s5?.yPosition).toBe(2);
    expect(s5?.startsAt).toBe("10:00");
    expect(s5?.endsAt).toBe("11:00");
    expect(s5?.weekday).toBe(1);

    // 1번은 원래 자리 (lane 1) 유지
    const s1 = result.find((s) => s.id === "s1");
    expect(s1?.yPosition).toBe(1);
  });

  it("기존 동작 회귀 가드: sourceYPos 가 비어있을 때는 isMovingToHigherLane redirect 유지", () => {
    // 시나리오: lane 1 단독 세션을 lane 3 로 이동. lane 2 에 충돌. lane 1 에 다른 시간 겹침 X.
    // sourceYPos(=1) 가 free → chain redirect 가 source 빈 자리로 → compaction 후 anchor 보존.
    const subjects2: Subject[] = [sub("sub-a", "A"), sub("sub-b", "B"), sub("sub-c", "C")];
    const enrollments2: Enrollment[] = [
      enr("ea", "sa", "sub-a"),
      enr("eb", "sb", "sub-b"),
      enr("ec", "sc", "sub-c"),
    ];
    const sessions2: Session[] = [
      session("sa", 1, "10:00", "11:00", ["ea"]), // 이동할 세션
      session("sb", 2, "10:00", "11:00", ["eb"]), // lane 2 점유
      session("sc", 3, "10:00", "11:00", ["ec"]), // lane 3 점유 (target — 충돌)
    ];

    const result = repositionSessions(
      sessions2,
      enrollments2,
      subjects2,
      1,
      "10:00",
      "11:00",
      3,
      "sa",
    );

    // sa 가 target lane 3 에 정착
    const sa = result.find((s) => s.id === "sa");
    expect(sa?.yPosition).toBe(3);

    // 모두 다른 lane, 같은 yPosition stack 없음
    const lanes = result.map((s) => s.yPosition);
    expect(new Set(lanes).size).toBe(3);
  });

  it("교차 요일 이동 (source = 다른 요일) 에서도 anchor stack 없음", () => {
    const sub2: Subject = sub("sub-x", "X");
    const enrs: Enrollment[] = [
      enr("e1", "s1", "sub-x"),
      enr("e2", "s2", "sub-x"),
      enr("e3", "s3", "sub-x"),
    ];
    const sessions3: Session[] = [
      // 월요일 (weekday=0) 에 s-move
      { ...session("s-move", 1, "10:00", "11:00", ["e1"]), weekday: 0 },
      // 화요일 lane 1, lane 2 점유
      session("s-tue-1", 1, "10:00", "11:00", ["e2"]),
      session("s-tue-2", 2, "10:00", "11:00", ["e3"]),
    ];

    const result = repositionSessions(
      sessions3,
      enrs,
      [sub2],
      1, // 화요일로
      "10:00",
      "11:00",
      1, // target lane = 1
      "s-move",
    );

    const tueSessions = result.filter((s) => s.weekday === 1);
    const lanes = tueSessions.map((s) => s.yPosition);
    // 각 lane 유일 — stack 없음
    expect(new Set(lanes).size).toBe(lanes.length);
  });
});
