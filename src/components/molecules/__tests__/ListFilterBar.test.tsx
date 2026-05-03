import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ListFilterBar from "../ListFilterBar";

describe("ListFilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canAdd=false이면 추가 버튼을 렌더하지 않는다", () => {
    render(<ListFilterBar value="" onChange={() => {}} canAdd={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("canAdd=false이면 엔터를 눌러도 onAdd가 호출되지 않는다", () => {
    const onAdd = vi.fn();
    render(
      <ListFilterBar
        value="홍길동"
        onChange={() => {}}
        canAdd={false}
        onAdd={onAdd}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("canAdd=true에서 엔터를 누르면 trimmed 값으로 onAdd가 호출된다", () => {
    const onAdd = vi.fn();
    render(
      <ListFilterBar
        value="  홍길동  "
        onChange={() => {}}
        canAdd={true}
        onAdd={onAdd}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("홍길동");
  });

  it("canAdd=true에서 추가 버튼 클릭 시 onAdd가 호출된다", () => {
    const onAdd = vi.fn();
    render(
      <ListFilterBar
        value="과목A"
        onChange={() => {}}
        canAdd={true}
        onAdd={onAdd}
        ariaLabelAdd="과목 추가"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "과목 추가" }));
    expect(onAdd).toHaveBeenCalledWith("과목A");
  });

  it("value가 비어있으면 추가 버튼이 비활성화된다", () => {
    render(
      <ListFilterBar
        value=""
        onChange={() => {}}
        canAdd={true}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("value가 비어있을 때 엔터를 눌러도 onAdd가 호출되지 않는다", () => {
    const onAdd = vi.fn();
    render(
      <ListFilterBar
        value="   "
        onChange={() => {}}
        canAdd={true}
        onAdd={onAdd}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("input 입력 시 onChange가 호출된다", () => {
    const onChange = vi.fn();
    render(
      <ListFilterBar value="" onChange={onChange} canAdd={true} />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "강사B" },
    });
    expect(onChange).toHaveBeenCalledWith("강사B");
  });

  it("한글 IME 조합 중 엔터는 onAdd를 호출하지 않는다", () => {
    const onAdd = vi.fn();
    render(
      <ListFilterBar
        value="홍"
        onChange={() => {}}
        canAdd={true}
        onAdd={onAdd}
      />,
    );
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      isComposing: true,
    });
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("placeholder를 prop으로 전달하면 적용된다", () => {
    render(
      <ListFilterBar
        value=""
        onChange={() => {}}
        canAdd={false}
        placeholder="학생 이름으로 검색"
      />,
    );
    expect(screen.getByPlaceholderText("학생 이름으로 검색")).toBeInTheDocument();
  });
});
