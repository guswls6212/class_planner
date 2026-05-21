import { describe, expect, it } from "vitest";
import {
  getGroupStudentNames,
  getSessionBlockStyles,
  resolveSessionColor,
  sessionMatchesFilters,
} from "../SessionBlock.utils";

describe("getSessionBlockStyles", () => {
  const defaultParams = {
    left: 100,
    width: 200,
    yOffset: 0,
    yPosition: 1,
    subjectColor: "#FF0000",
  };

  it("기본 상태에서 opacity는 1.0이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor
    );

    expect(styles.opacity).toBe(1.0);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("auto");
  });

  it("드래그 중이 아닐 때 opacity는 1.0이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(1.0);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("auto");
  });

  it("isAnyDragging이 true이고 드래그된 세션이 아닐 때 완전히 보여야 한다 (opacity 1, pointerEvents none)", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession (드래그된 세션이 아님)
      true // isAnyDragging
    );

    expect(styles.opacity).toBe(1);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("none");
  });

  it("isAnyDragging이 true이고 드래그된 세션일 때 반투명하고 pointer-events auto여야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      false, // isDragging
      true, // isDraggedSession (드래그된 세션)
      true // isAnyDragging
    );

    expect(styles.opacity).toBe(0.4);
    expect(styles.visibility).toBe("visible");
    // pointer-events auto 유지 — none으로 하면 Chrome이 네이티브 드래그를 즉시 취소함.
    // drop 가로채기 방지는 computeTentativeLayout excludeDraggedFromResult + DragGhost로 처리.
    expect(styles.pointerEvents).toBe("auto");
  });

  it("isDragging이 true이고 드래그된 세션이 아닐 때 완전히 보여야 한다 (opacity 1, pointerEvents none)", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      true, // isDragging
      false, // isDraggedSession (드래그된 세션이 아님)
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(1);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("none");
  });

  it("isDragging이 true이고 드래그된 세션일 때 반투명하고 pointer-events auto여야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      true, // isDragging
      true, // isDraggedSession (드래그된 세션)
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(0.4);
    expect(styles.visibility).toBe("visible");
    // pointer-events auto 유지 — none으로 하면 Chrome이 네이티브 드래그를 즉시 취소함.
    expect(styles.pointerEvents).toBe("auto");
  });

  it("isAnyDragging이 우선순위가 높아야 한다 (isDragging보다)", () => {
    // isAnyDragging이 true이면 isDragging 값과 관계없이 isAnyDragging 로직이 적용되어야 함
    const styles1 = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      true, // isDragging
      false, // isDraggedSession
      true // isAnyDragging (우선순위 높음)
    );

    expect(styles1.opacity).toBe(1); // 비드래그 세션은 완전히 보임
    expect(styles1.pointerEvents).toBe("none"); // drop target인 cell에 이벤트 전달

    const styles2 = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession
      true // isAnyDragging (우선순위 높음)
    );

    expect(styles2.opacity).toBe(1); // 동일한 결과
  });

  it("드래그 중 비-대상 세션도 zIndex를 100+yPosition으로 유지한다", () => {
    const yPosition = 2;
    const styles = getSessionBlockStyles(
      0, 100, 94, yPosition, "#FF0000",
      true, // isDragging
      false, // not the dragged session
      true   // isAnyDragging
    );
    expect(styles.zIndex).toBe(100 + yPosition);
  });

  it("드래그 중인 세션의 zIndex는 500으로 상승한다 (항상 맨 앞)", () => {
    const yPosition = 3;
    const styles = getSessionBlockStyles(
      0, 100, 47, yPosition, "#FF0000",
      true, true, true
    );
    expect(styles.zIndex).toBe(500);
  });

  it("비드래그 상태의 기본 zIndex는 100+yPosition이다", () => {
    const yPosition = 1;
    const styles = getSessionBlockStyles(0, 100, 0, yPosition, "#FF0000");
    expect(styles.zIndex).toBe(100 + yPosition);
  });

  it("과목 색상이 없을 때 기본 색상(#888)을 단색으로 사용해야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      undefined // subjectColor 없음
    );

    expect(styles.background).toBe("#888");
    // borderLeft는 getSessionBlockStyles 반환값에 포함되지 않음 (SessionBlock.tsx에서 처리)
    expect(styles.borderLeft).toBeUndefined();
  });

  it("유효한 6자리 hex 과목 색상이 있을 때 해당 색상을 단색으로 반환해야 한다 (gradient는 SessionBlock.tsx에서 처리)", () => {
    const customColor = "#FF5733";
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.yPosition,
      customColor
    );

    // getSessionBlockStyles는 flat color만 반환 — gradient 변환은 SessionBlock.tsx에서 수행
    expect(styles.background).toBe(customColor);
    expect(styles.borderLeft).toBeUndefined();
  });

  it("드래그 중인 세션(isDraggedSession=true, isAnyDragging=true)의 zIndex는 500이다", () => {
    const styles = getSessionBlockStyles(
      0, 120, 0, 2, "#3B82F6",
      /*isDragging*/ true, /*isDraggedSession*/ true, /*isAnyDragging*/ true
    );
    expect(styles.zIndex).toBe(500);
  });

  it("비드래그 세션의 zIndex는 100 + yPosition이다", () => {
    const styles = getSessionBlockStyles(
      0, 120, 0, 3, "#3B82F6",
      false, false, false
    );
    expect(styles.zIndex).toBe(103);
  });

  it("isAnyDragging=true이지만 isDraggedSession=false이면 zIndex는 100 + yPosition이다", () => {
    const styles = getSessionBlockStyles(
      0, 120, 0, 2, "#3B82F6",
      true, false, true
    );
    expect(styles.zIndex).toBe(102);
  });
});

describe("resolveSessionColor", () => {
  const mockSession = {
    id: "session-1",
    enrollmentIds: ["enroll-1"],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
  };

  const mockEnrollments = [
    { id: "enroll-1", studentId: "student-1", subjectId: "subject-1" },
  ];

  const mockSubjects = [
    { id: "subject-1", name: "수학", color: "#FF0000" },
  ];

  const mockStudents = [
    { id: "student-1", name: "김철수" },
  ];

  const mockTeachers = [
    { id: "teacher-1", name: "홍길동", color: "#0000FF" },
  ];

  it("colorBy='subject' 일 때 과목 색상을 반환한다 (regression)", () => {
    const color = resolveSessionColor(
      mockSession as any,
      "subject",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers
    );
    expect(color).toBe("#FF0000");
  });

  it("colorBy='student', selectedStudentIds 없음 → 과목 색상 폴백", () => {
    const color = resolveSessionColor(
      mockSession as any,
      "student",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers,
      undefined
    );
    expect(color).toBe("#FF0000");
  });

  it("colorBy='student', selectedStudentIds=[] (빈 배열) → 과목 색상 폴백", () => {
    const color = resolveSessionColor(
      mockSession as any,
      "student",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers,
      []
    );
    expect(color).toBe("#FF0000");
  });

  it("colorBy='student', selectedStudentIds 있음 → 과목 색상 폴백 (ADR-020 R5)", () => {
    // ADR-020 R5: colorBy='student' 모드 폐기. session 본체 색은 항상 과목 색.
    // 학생 선택은 dim contrast 로만 시각화 (SessionBlock 에서 처리), 본체 색 변경 X.
    const color = resolveSessionColor(
      mockSession as any,
      "student",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers,
      ["student-1"]
    );
    expect(color).toBe("#FF0000");
  });

  it("colorBy='subject' 일 때 selectedStudentIds를 무시한다 (regression)", () => {
    const colorWithout = resolveSessionColor(
      mockSession as any,
      "subject",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers
    );
    const colorWith = resolveSessionColor(
      mockSession as any,
      "subject",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers,
      ["student-1"]
    );
    expect(colorWithout).toBe("#FF0000");
    expect(colorWith).toBe("#FF0000");
  });
});

describe("getGroupStudentNames", () => {
  const session = {
    id: "s1",
    enrollmentIds: ["e1", "e2", "e3"],
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
  } as any;

  const enrollments = [
    { id: "e1", studentId: "sid-A", subjectId: "sub-1" },
    { id: "e2", studentId: "sid-B", subjectId: "sub-1" },
    { id: "e3", studentId: "sid-C", subjectId: "sub-1" },
  ];

  const students = [
    { id: "sid-A", name: "이현진" },
    { id: "sid-B", name: "김요섭" },
    { id: "sid-C", name: "강지원" },
  ];

  it("selectedStudentIds 없음(undefined) → 모든 학생 이름 반환", () => {
    const result = getGroupStudentNames(session, enrollments, students, undefined);
    expect(result).toEqual(["이현진", "김요섭", "강지원"]);
  });

  it("selectedStudentIds=[] (빈 배열) → 모든 학생 이름 반환 (비필터 모드)", () => {
    const result = getGroupStudentNames(session, enrollments, students, []);
    expect(result).toEqual(["이현진", "김요섭", "강지원"]);
  });

  it("selectedStudentIds=[sid-A] → 이 세션에서 sid-A의 이름만 반환", () => {
    const result = getGroupStudentNames(session, enrollments, students, ["sid-A"]);
    expect(result).toEqual(["이현진"]);
  });

  it("selectedStudentIds=[sid-A, sid-B] → 두 학생 모두 이 세션에 있으면 두 이름 반환", () => {
    const result = getGroupStudentNames(session, enrollments, students, ["sid-A", "sid-B"]);
    expect(result).toEqual(["이현진", "김요섭"]);
  });

  it("selectedStudentIds=[sid-A] 이고 세션에 sid-A 미포함 → 빈 배열 (비매칭 세션)", () => {
    const sessionWithoutA = { ...session, enrollmentIds: ["e2", "e3"] } as any;
    const result = getGroupStudentNames(sessionWithoutA, enrollments, students, ["sid-A"]);
    expect(result).toEqual([]);
  });

  it("멀티셀렉트: selectedStudentIds=[sid-A, sid-B] 이고 세션에 sid-B만 있음 → sid-B 이름만 반환", () => {
    const sessionOnlyB = { ...session, enrollmentIds: ["e2"] } as any;
    const result = getGroupStudentNames(sessionOnlyB, enrollments, students, ["sid-A", "sid-B"]);
    expect(result).toEqual(["김요섭"]);
  });

  it("enrollmentIds 없는 세션 → 빈 배열", () => {
    const emptySession = { ...session, enrollmentIds: [] } as any;
    const result = getGroupStudentNames(emptySession, enrollments, students, ["sid-A"]);
    expect(result).toEqual([]);
  });

  it("students 배열에 record 없는 enrollment → 해당 항목 제외", () => {
    const result = getGroupStudentNames(session, enrollments, [{ id: "sid-A", name: "이현진" }], ["sid-A", "sid-B"]);
    expect(result).toEqual(["이현진"]);
  });
});

describe("sessionMatchesFilters — 학생/과목/강사 AND 결합", () => {
  const enrollments = [
    { id: "e1", studentId: "stu-A", subjectId: "sub-1" },
    { id: "e2", studentId: "stu-B", subjectId: "sub-2" },
  ];
  const sessionWithBoth = {
    id: "s1",
    enrollmentIds: ["e1", "e2"],
    teacherId: "tch-1",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
  } as any;

  it("필터 모두 비활성 → 항상 매칭", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, [], [], [])).toBe(true);
  });

  it("학생만 활성 + 매칭 → true", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], [], [])).toBe(true);
  });

  it("학생만 활성 + 비매칭 → false", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-X"], [], [])).toBe(false);
  });

  it("강사만 활성 + 매칭 → true", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, [], [], ["tch-1"])).toBe(true);
  });

  it("강사만 활성 + 비매칭 → false", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, [], [], ["tch-9"])).toBe(false);
  });

  it("session.teacherId=null + 강사 활성 → false", () => {
    const noTeacher = { ...sessionWithBoth, teacherId: null };
    expect(sessionMatchesFilters(noTeacher, enrollments, [], [], ["tch-1"])).toBe(false);
  });

  it("학생+강사 동시 활성 + 둘 다 매칭 → true", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], [], ["tch-1"])).toBe(true);
  });

  it("학생+강사 동시 활성 + 학생 매칭 / 강사 비매칭 → false (AND)", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], [], ["tch-9"])).toBe(false);
  });

  it("학생+과목+강사 3 동시 활성 + 모두 매칭 → true", () => {
    expect(
      sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], ["sub-1"], ["tch-1"]),
    ).toBe(true);
  });

  it("학생+과목+강사 3 동시 활성 + 과목만 비매칭 → false", () => {
    expect(
      sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], ["sub-9"], ["tch-1"]),
    ).toBe(false);
  });

  it("4번째 인자 default(미전달) → 학생/과목 필터만으로 동작 (BC)", () => {
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-A"], [])).toBe(true);
    expect(sessionMatchesFilters(sessionWithBoth, enrollments, ["stu-X"], [])).toBe(false);
  });
});

// ADR-020 R5: `pickRingHex` 함수 폐기 (필터 매칭 ring 자체 제거 — dim contrast 만 사용).
// 이전 describe("pickRingHex — 매칭 ring 색 우선순위") block 은 본 PR 에서 삭제.
