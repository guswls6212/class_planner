import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailTooltip } from "../DetailTooltip";

describe("DetailTooltip", () => {
  it("sections 가 모두 비어있으면 트리거만 렌더 (no-op wrap)", () => {
    render(
      <DetailTooltip sections={[]}>
        <span>trigger</span>
      </DetailTooltip>,
    );
    expect(screen.getByText("trigger")).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("sections 의 모든 rows 가 비어있어도 트리거만 렌더", () => {
    render(
      <DetailTooltip sections={[{ title: "헤더", rows: [] }]}>
        <span>trigger</span>
      </DetailTooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("rows 가 있으면 role=tooltip 컨테이너를 portal 에 렌더한다", () => {
    render(
      <DetailTooltip
        sections={[
          { title: "학생 정보", rows: [{ label: "성별", value: "남" }] },
        ]}
      >
        <span>chip</span>
      </DetailTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toBeInTheDocument();
    expect(tip).toHaveTextContent("학생 정보");
    expect(tip).toHaveTextContent("성별");
    expect(tip).toHaveTextContent("남");
  });

  it("portal 로 document.body 직속에 마운트된다 (overflow 클립 회피)", () => {
    render(
      <DetailTooltip sections={[{ rows: [{ label: "a", value: "1" }] }]}>
        <span>chip</span>
      </DetailTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    // portal 이면 부모 chain 에 트리거 wrapper 가 없어야 한다.
    expect(tip.closest("[data-testid]")).toBeNull();
    // 실제 부모는 document.body 직속.
    expect(tip.parentElement).toBe(document.body);
  });

  it("여러 섹션 사이에 divider 가 들어간다", () => {
    render(
      <DetailTooltip
        sections={[
          { title: "S1", rows: [{ label: "a", value: "1" }] },
          { title: "S2", rows: [{ label: "b", value: "2" }] },
        ]}
      >
        <span>trigger</span>
      </DetailTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    const dividers = tip.querySelectorAll('[aria-hidden="true"]');
    expect(dividers.length).toBeGreaterThanOrEqual(1);
  });

  it("placement=bottom 시 data-placement 속성이 bottom", () => {
    render(
      <DetailTooltip
        sections={[{ rows: [{ label: "a", value: "1" }] }]}
        placement="bottom"
      >
        <span>chip</span>
      </DetailTooltip>,
    );
    expect(screen.getByRole("tooltip")).toHaveAttribute(
      "data-placement",
      "bottom",
    );
  });

  it("default placement=top 시 data-placement 속성이 top", () => {
    render(
      <DetailTooltip sections={[{ rows: [{ label: "a", value: "1" }] }]}>
        <span>chip</span>
      </DetailTooltip>,
    );
    expect(screen.getByRole("tooltip")).toHaveAttribute(
      "data-placement",
      "top",
    );
  });

  it("기본 상태는 invisible (opacity-0, data-visible=false)", () => {
    render(
      <DetailTooltip sections={[{ rows: [{ label: "a", value: "1" }] }]}>
        <span>chip</span>
      </DetailTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveAttribute("data-visible", "false");
    expect(tip.className).toMatch(/opacity-0/);
  });
});
