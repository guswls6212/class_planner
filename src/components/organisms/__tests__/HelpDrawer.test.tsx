import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  X: () => <svg data-testid="x-icon" />,
}));

import { HelpDrawerProvider, useHelpDrawer } from "../../../contexts/HelpDrawerContext";
import { HelpDrawer } from "../HelpDrawer";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <HelpDrawerProvider>{children}</HelpDrawerProvider>;
}

function OpenButton() {
  const { open } = useHelpDrawer();
  return <button onClick={open}>열기</button>;
}

describe("HelpDrawer", () => {
  it("기본 상태에서 렌더되지 않는다", () => {
    render(
      <TestWrapper>
        <HelpDrawer />
      </TestWrapper>
    );
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("open() 후 드로워가 렌더된다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("도움말")).toBeDefined();
  });

  it("X 버튼 클릭 시 드로워가 닫힌다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("도움말")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("백드롭 클릭 시 드로워가 닫힌다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    fireEvent.click(screen.getByTestId("help-drawer-backdrop"));
    expect(screen.queryByText("도움말")).toBeNull();
  });

  it("도움말 섹션 5개가 렌더된다", () => {
    render(
      <TestWrapper>
        <OpenButton />
        <HelpDrawer />
      </TestWrapper>
    );
    fireEvent.click(screen.getByText("열기"));
    expect(screen.getByText("시간표 작성 시작하기")).toBeDefined();
    expect(screen.getByText("일별·주간·월별 뷰")).toBeDefined();
    expect(screen.getByText("템플릿 저장·적용")).toBeDefined();
    expect(screen.getByText("PDF 출력")).toBeDefined();
    expect(screen.getByText("공유 링크")).toBeDefined();
  });
});
