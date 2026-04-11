import { describe, expect, it } from "vitest";
import {
  getGroupStudentDisplayText,
  getSessionBlockStyles,
} from "../SessionBlock.utils";

describe("getGroupStudentDisplayText", () => {
  it("학생 0명 → 빈 문자열", () => {
    expect(getGroupStudentDisplayText([])).toBe("");
  });

  it("학생 1명 → 이름만", () => {
    expect(getGroupStudentDisplayText(["홍길동"])).toBe("홍길동");
  });

  it("학생 2명 → 쉼표 구분", () => {
    expect(getGroupStudentDisplayText(["홍길동", "김철수"])).toBe(
      "홍길동, 김철수"
    );
  });

  it("학생 3명 → 쉼표 구분", () => {
    expect(getGroupStudentDisplayText(["A", "B", "C"])).toBe("A, B, C");
  });

  it("학생 4명 → 첫 3명 + 외 1명", () => {
    expect(getGroupStudentDisplayText(["A", "B", "C", "D"])).toBe(
      "A, B, C 외 1명"
    );
  });

  it("학생 6명 → 첫 3명 + 외 3명", () => {
    expect(getGroupStudentDisplayText(["A", "B", "C", "D", "E", "F"])).toBe(
      "A, B, C 외 3명"
    );
  });
});

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

  it("isAnyDragging이 true이고 드래그된 세션이 아닐 때 opacity는 0.3이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession (드래그된 세션이 아님)
      true // isAnyDragging
    );

    expect(styles.opacity).toBe(0.3);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("none");
  });

  it("isAnyDragging이 true이고 드래그된 세션일 때 opacity는 0이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      false, // isDragging
      true, // isDraggedSession (드래그된 세션)
      true // isAnyDragging
    );

    expect(styles.opacity).toBe(0);
    expect(styles.visibility).toBe("hidden");
    expect(styles.pointerEvents).toBe("auto");
  });

  it("isDragging이 true이고 드래그된 세션이 아닐 때 opacity는 0.3이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      true, // isDragging
      false, // isDraggedSession (드래그된 세션이 아님)
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(0.3);
    expect(styles.visibility).toBe("visible");
    expect(styles.pointerEvents).toBe("none");
  });

  it("isDragging이 true이고 드래그된 세션일 때 opacity는 0이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      true, // isDragging
      true, // isDraggedSession (드래그된 세션)
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(0);
    expect(styles.visibility).toBe("hidden");
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

    expect(styles1.opacity).toBe(0.3); // isAnyDragging 로직 적용

    const styles2 = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      false, // isDragging
      false, // isDraggedSession
      true // isAnyDragging (우선순위 높음)
    );

    expect(styles2.opacity).toBe(0.3); // 동일한 결과
  });

  it("과목 색상이 없을 때 기본 색상(#888)을 사용해야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      undefined // subjectColor 없음
    );

    expect(styles.background).toBe("#888");
  });

  it("과목 색상이 있을 때 해당 색상을 사용해야 한다", () => {
    const customColor = "#FF5733";
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      customColor
    );

    expect(styles.background).toBe(customColor);
  });
});
