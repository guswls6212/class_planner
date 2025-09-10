import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Label, {
  getLabelClasses,
  getWrapperClasses,
  shouldShowHelpText,
  shouldShowRequired,
  validateLabelSize,
  validateLabelVariant,
} from "../Label";

describe("Label Component", () => {
  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<Label>테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe("LABEL");
  });

  it("htmlFor 속성이 올바르게 적용되어야 한다", () => {
    render(<Label htmlFor="test-input">테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toHaveAttribute("for", "test-input");
  });

  it("required prop이 올바르게 표시되어야 한다", () => {
    render(<Label required={true}>테스트 라벨</Label>);

    expect(screen.getByText("테스트 라벨")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("helpText가 올바르게 표시되어야 한다", () => {
    render(<Label helpText="도움말 텍스트">테스트 라벨</Label>);

    expect(screen.getByText("테스트 라벨")).toBeInTheDocument();
    expect(screen.getByText("도움말 텍스트")).toBeInTheDocument();
  });

  it("size prop이 올바르게 적용되어야 한다", () => {
    const { rerender } = render(<Label size="small">테스트 라벨</Label>);
    let label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("small");

    rerender(<Label size="large">테스트 라벨</Label>);
    label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("large");
  });

  it("variant prop이 올바르게 적용되어야 한다", () => {
    const { rerender } = render(<Label variant="checkbox">테스트 라벨</Label>);
    let label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("checkbox");

    rerender(<Label variant="inline">테스트 라벨</Label>);
    label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("inline");
  });

  it("error prop이 올바르게 적용되어야 한다", () => {
    render(<Label error={true}>테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("error");
  });

  it("success prop이 올바르게 적용되어야 한다", () => {
    render(<Label success={true}>테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("success");
  });

  it("warning prop이 올바르게 적용되어야 한다", () => {
    render(<Label warning={true}>테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("warning");
  });

  it("disabled prop이 올바르게 적용되어야 한다", () => {
    render(<Label disabled={true}>테스트 라벨</Label>);

    const label = screen.getByText("테스트 라벨");
    expect(label).toHaveClass("disabled");
  });

  it("group variant일 때 wrapper 클래스가 적용되어야 한다", () => {
    render(<Label variant="group">테스트 라벨</Label>);

    const wrapper = screen.getByText("테스트 라벨").parentElement;
    expect(wrapper).toHaveClass("labelGroup");
  });

  // 엣지 케이스 테스트
  it("children이 null일 때 안전하게 처리되어야 한다", () => {
    render(<Label>{null}</Label>);

    const label = screen.getByTestId("label");
    expect(label).toBeInTheDocument();
  });

  it("children이 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<Label>{undefined}</Label>);

    const label = screen.getByTestId("label");
    expect(label).toBeInTheDocument();
  });

  it("빈 문자열 children을 안전하게 처리해야 한다", () => {
    render(<Label>{""}</Label>);

    const label = screen.getByTestId("label");
    expect(label).toBeInTheDocument();
  });

  it("매우 긴 텍스트를 안전하게 처리해야 한다", () => {
    const longText = "a".repeat(1000);
    render(<Label>{longText}</Label>);

    const label = screen.getByText(longText);
    expect(label).toBeInTheDocument();
  });

  it("특수 문자가 포함된 텍스트를 안전하게 처리해야 한다", () => {
    const specialText = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    render(<Label>{specialText}</Label>);

    const label = screen.getByText(specialText);
    expect(label).toBeInTheDocument();
  });

  it("여러 상태가 동시에 적용되어야 한다", () => {
    render(
      <Label
        required={true}
        error={true}
        helpText="에러 메시지"
        size="large"
        variant="inline"
      >
        테스트 라벨
      </Label>
    );

    const label = screen.getByText("테스트 라벨");
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("large");
    expect(label).toHaveClass("inline");
    expect(label).toHaveClass("error");
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByText("에러 메시지")).toBeInTheDocument();
  });
});

describe("Label Utility Functions", () => {
  describe("getLabelClasses", () => {
    it("기본 클래스들이 올바르게 생성되어야 한다", () => {
      const classes = getLabelClasses(
        "medium",
        "default",
        false,
        false,
        false,
        false
      );
      expect(classes).toBe("label medium default");
    });

    it("error 상태일 때 error 클래스가 추가되어야 한다", () => {
      const classes = getLabelClasses(
        "medium",
        "default",
        true,
        false,
        false,
        false
      );
      expect(classes).toBe("label medium default error");
    });

    it("success 상태일 때 success 클래스가 추가되어야 한다", () => {
      const classes = getLabelClasses(
        "medium",
        "default",
        false,
        true,
        false,
        false
      );
      expect(classes).toBe("label medium default success");
    });

    it("warning 상태일 때 warning 클래스가 추가되어야 한다", () => {
      const classes = getLabelClasses(
        "medium",
        "default",
        false,
        false,
        true,
        false
      );
      expect(classes).toBe("label medium default warning");
    });

    it("disabled 상태일 때 disabled 클래스가 추가되어야 한다", () => {
      const classes = getLabelClasses(
        "medium",
        "default",
        false,
        false,
        false,
        true
      );
      expect(classes).toBe("label medium default disabled");
    });

    it("모든 상태가 true일 때 모든 클래스가 추가되어야 한다", () => {
      const classes = getLabelClasses(
        "large",
        "checkbox",
        true,
        true,
        true,
        true
      );
      expect(classes).toBe(
        "label large checkbox error success warning disabled"
      );
    });
  });

  describe("getWrapperClasses", () => {
    it("group variant일 때 labelGroup 클래스가 반환되어야 한다", () => {
      const classes = getWrapperClasses("group");
      expect(classes).toBe("labelGroup");
    });

    it("다른 variant일 때 빈 문자열이 반환되어야 한다", () => {
      const classes = getWrapperClasses("default");
      expect(classes).toBe("");
    });
  });

  describe("shouldShowRequired", () => {
    it("required가 true일 때 true를 반환해야 한다", () => {
      expect(shouldShowRequired(true)).toBe(true);
    });

    it("required가 false일 때 false를 반환해야 한다", () => {
      expect(shouldShowRequired(false)).toBe(false);
    });
  });

  describe("shouldShowHelpText", () => {
    it("helpText가 있을 때 true를 반환해야 한다", () => {
      expect(shouldShowHelpText("도움말")).toBe(true);
    });

    it("helpText가 undefined일 때 false를 반환해야 한다", () => {
      expect(shouldShowHelpText(undefined)).toBe(false);
    });

    it("helpText가 빈 문자열일 때 false를 반환해야 한다", () => {
      expect(shouldShowHelpText("")).toBe(false);
    });
  });

  describe("validateLabelSize", () => {
    it("유효한 size일 때 true를 반환해야 한다", () => {
      expect(validateLabelSize("small")).toBe(true);
      expect(validateLabelSize("medium")).toBe(true);
      expect(validateLabelSize("large")).toBe(true);
    });

    it("유효하지 않은 size일 때 false를 반환해야 한다", () => {
      expect(validateLabelSize("extra-large")).toBe(false);
      expect(validateLabelSize("tiny")).toBe(false);
      expect(validateLabelSize("")).toBe(false);
    });
  });

  describe("validateLabelVariant", () => {
    it("유효한 variant일 때 true를 반환해야 한다", () => {
      expect(validateLabelVariant("default")).toBe(true);
      expect(validateLabelVariant("checkbox")).toBe(true);
      expect(validateLabelVariant("inline")).toBe(true);
      expect(validateLabelVariant("group")).toBe(true);
    });

    it("유효하지 않은 variant일 때 false를 반환해야 한다", () => {
      expect(validateLabelVariant("custom")).toBe(false);
      expect(validateLabelVariant("")).toBe(false);
    });
  });
});
