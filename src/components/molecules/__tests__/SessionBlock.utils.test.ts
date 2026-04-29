import { describe, expect, it } from "vitest";
import {
  getSessionBlockStyles,
  resolveSessionColor,
} from "../SessionBlock.utils";

describe("getSessionBlockStyles", () => {
  const defaultParams = {
    left: 100,
    width: 200,
    yOffset: 0,
    subjectColor: "#FF0000",
  };

  it("기본 상태에서 opacity는 1.0이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
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
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession
      true // isAnyDragging (우선순위 높음)
    );

    expect(styles2.opacity).toBe(1); // 동일한 결과
  });

  it("드래그 중 비-대상 세션도 zIndex를 100+yOffset으로 유지한다 (Bug4 fix)", () => {
    const yOffset = 94;
    const styles = getSessionBlockStyles(
      0, 100, yOffset, "#FF0000",
      true, // isDragging
      false, // not the dragged session
      true   // isAnyDragging
    );
    expect(styles.zIndex).toBe(100 + yOffset);
  });

  it("드래그 중 드래그 대상 세션도 zIndex를 100+yOffset으로 유지한다", () => {
    const yOffset = 47;
    const styles = getSessionBlockStyles(
      0, 100, yOffset, "#FF0000",
      true, true, true
    );
    expect(styles.zIndex).toBe(100 + yOffset);
  });

  it("비드래그 상태의 기본 zIndex는 100+yOffset이다", () => {
    const yOffset = 0;
    const styles = getSessionBlockStyles(0, 100, yOffset, "#FF0000");
    expect(styles.zIndex).toBe(100 + yOffset);
  });

  it("과목 색상이 없을 때 기본 색상(#888)을 단색으로 사용해야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
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
      customColor
    );

    // getSessionBlockStyles는 flat color만 반환 — gradient 변환은 SessionBlock.tsx에서 수행
    expect(styles.background).toBe(customColor);
    expect(styles.borderLeft).toBeUndefined();
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

  it("colorBy='student', selectedStudentIds 있음 → 학생 해시 색상 반환", () => {
    const color = resolveSessionColor(
      mockSession as any,
      "student",
      mockEnrollments,
      mockSubjects as any,
      mockStudents,
      mockTeachers,
      ["student-1"]
    );
    // Should NOT be the subject color — should be a student hash color
    expect(color).not.toBe("#FF0000");
    // Should be a valid hex color from Q_PASTEL_PALETTE
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
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
