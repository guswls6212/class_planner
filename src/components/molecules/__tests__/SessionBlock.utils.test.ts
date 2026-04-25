import { describe, expect, it } from "vitest";
import {
  getSessionBlockStyles,
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

  it("isAnyDragging이 true이고 드래그된 세션일 때 ghost로 표시되고 pointer-events none이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      false, // isDragging
      true, // isDraggedSession (드래그된 세션)
      true // isAnyDragging
    );

    expect(styles.opacity).toBe(0.65);
    expect(styles.visibility).toBe("visible");
    // pointer-events none — dragstart 이후 변경이므로 Chrome 드래그 취소 없음.
    // computeTentativeLayout이 이 블록을 target 위치로 이동시켜도 drop 가로채기 방지.
    expect(styles.pointerEvents).toBe("none");
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

  it("isDragging이 true이고 드래그된 세션일 때 ghost로 표시되고 pointer-events none이어야 한다", () => {
    const styles = getSessionBlockStyles(
      defaultParams.left,
      defaultParams.width,
      defaultParams.yOffset,
      defaultParams.subjectColor,
      true, // isDragging
      true, // isDraggedSession (드래그된 세션)
      false // isAnyDragging
    );

    expect(styles.opacity).toBe(0.65);
    expect(styles.visibility).toBe("visible");
    // pointer-events none — dragstart 이후 변경이므로 Chrome 드래그 취소 없음.
    expect(styles.pointerEvents).toBe("none");
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
