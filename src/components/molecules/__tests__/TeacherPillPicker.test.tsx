import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeacherPillPicker from "../TeacherPillPicker";
import type { Teacher } from "@/lib/planner";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockTeachers: Teacher[] = [
  { id: "t1", name: "김선생", color: "#FF5733" },
  { id: "t2", name: "이선생", color: "#33C1FF" },
];

describe("TeacherPillPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("teachers가 빈 배열이면 '강사 없음' 메시지와 등록 링크를 렌더한다", () => {
    render(
      <TeacherPillPicker teachers={[]} selectedTeacherId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByText("강사 없음")).toBeInTheDocument();
    expect(screen.getByText("강사 등록 →")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "강사 등록 →" });
    expect(link).toHaveAttribute("href", "/teachers");
  });

  it("각 선생님에 대해 pill 버튼을 렌더한다", () => {
    render(
      <TeacherPillPicker teachers={mockTeachers} selectedTeacherId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /김선생/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /이선생/ })).toBeInTheDocument();
  });

  it("비선택 pill은 aria-pressed=false", () => {
    render(
      <TeacherPillPicker teachers={mockTeachers} selectedTeacherId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /김선생/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /이선생/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("선택된 pill은 aria-pressed=true, 나머지는 false", () => {
    render(
      <TeacherPillPicker teachers={mockTeachers} selectedTeacherId="t1" onSelect={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /김선생/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /이선생/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("비선택 pill 클릭 시 onSelect(teacherId) 호출", () => {
    const onSelect = vi.fn();
    render(
      <TeacherPillPicker teachers={mockTeachers} selectedTeacherId={null} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole("button", { name: /김선생/ }));
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("이미 선택된 pill 클릭 시 onSelect(null) 호출 (deselect)", () => {
    const onSelect = vi.fn();
    render(
      <TeacherPillPicker teachers={mockTeachers} selectedTeacherId="t2" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole("button", { name: /이선생/ }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe("TeacherPillPicker — 인라인 강사 추가", () => {
  beforeEach(() => vi.clearAllMocks());

  it("canManage=false 면 '＋ 새 강사' pill 미렌더", () => {
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={false}
        inputValue=""
        setInputValue={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.queryByRole("button", { name: /＋ 새 강사/ })).not.toBeInTheDocument();
  });

  it("canManage=true + onCreate/setInputValue 제공 시 '＋ 새 강사' pill 렌더", () => {
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={true}
        inputValue=""
        setInputValue={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.getByRole("button", { name: /＋ 새 강사/ })).toBeInTheDocument();
  });

  it("'＋ 새 강사' 클릭 시 인라인 row(input + 생성 + 닫기) 렌더", () => {
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={true}
        inputValue=""
        setInputValue={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(true)}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /＋ 새 강사/ }));
    expect(screen.getByPlaceholderText("새 강사 이름")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "생성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("'생성' 클릭 시 onCreate가 호출된다", async () => {
    const onCreate = vi.fn().mockResolvedValue(true);
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={true}
        inputValue="박선생"
        setInputValue={vi.fn()}
        onCreate={onCreate}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /＋ 새 강사/ }));
    fireEvent.click(screen.getByRole("button", { name: "생성" }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼 클릭 시 row 닫힘 + setInputValue('') 호출", () => {
    const setInputValue = vi.fn();
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={true}
        inputValue="박"
        setInputValue={setInputValue}
        onCreate={vi.fn().mockResolvedValue(true)}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /＋ 새 강사/ }));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(setInputValue).toHaveBeenCalledWith("");
    expect(screen.queryByPlaceholderText("새 강사 이름")).not.toBeInTheDocument();
  });

  it("createError가 있으면 에러 메시지가 표시된다", () => {
    render(
      <TeacherPillPicker
        teachers={mockTeachers}
        selectedTeacherId={null}
        onSelect={vi.fn()}
        canManage={true}
        inputValue="박"
        setInputValue={vi.fn()}
        onCreate={vi.fn().mockResolvedValue(false)}
        createError="이미 같은 이름의 강사가 존재합니다."
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /＋ 새 강사/ }));
    expect(screen.getByText("이미 같은 이름의 강사가 존재합니다.")).toBeInTheDocument();
  });
});
