import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MemberListItem, { type Member } from "../MemberListItem";

const baseMember: Member = {
  userId: "user-abc",
  role: "member",
  email: "test@example.com",
  name: "김강사",
  joinedAt: "2026-01-01T00:00:00Z",
  linkedTeacherId: null,
  linkedTeacherName: null,
  linkedTeacherColor: null,
};

describe("MemberListItem", () => {
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("멤버 이름과 역할 배지를 렌더링한다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("김강사")).toBeDefined();
    expect(screen.getByText("강사")).toBeDefined();
  });

  it("linkedTeacherName이 null이면 강사 배지가 없다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.queryByText(/강사:/)).toBeNull();
  });

  it("linkedTeacherName이 있으면 강사 배지가 표시된다", () => {
    const member: Member = {
      ...baseMember,
      linkedTeacherId: "teacher-1",
      linkedTeacherName: "이선생",
      linkedTeacherColor: "#ff5733",
    };

    render(
      <MemberListItem
        member={member}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("강사: 이선생")).toBeDefined();
  });

  it("강사 배지의 색상 점이 올바른 인라인 스타일을 가진다", () => {
    const member: Member = {
      ...baseMember,
      linkedTeacherId: "teacher-1",
      linkedTeacherName: "이선생",
      linkedTeacherColor: "#ff5733",
    };

    const { container } = render(
      <MemberListItem
        member={member}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    // The color dot uses inline style for dynamic color
    const dot = container.querySelector('[style*="background-color"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("style")).toContain("rgb(255, 87, 51)");
  });

  it("owner 역할이고 본인이 아닌 경우 제거 버튼이 표시된다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.getByRole("button", { name: "제거" })).toBeDefined();
  });

  it("제거 버튼 클릭 시 onRemove가 해당 userId로 호출된다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="owner"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    const removeButton = screen.getByRole("button", { name: "제거" });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith("user-abc");
  });

  it("member.userId === userId (본인)이면 제거 버튼이 없다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="owner"
        userId="user-abc"
        onRemove={onRemove}
      />
    );

    expect(screen.queryByRole("button", { name: "제거" })).toBeNull();
    expect(screen.getByText("본인")).toBeDefined();
  });

  it("myRole이 'admin'이면 제거 버튼이 없다", () => {
    render(
      <MemberListItem
        member={baseMember}
        myRole="admin"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.queryByRole("button", { name: "제거" })).toBeNull();
  });

  it("owner 역할 배지는 amber(accent) 스타일로 렌더링된다", () => {
    const ownerMember: Member = { ...baseMember, role: "owner" };

    render(
      <MemberListItem
        member={ownerMember}
        myRole="owner"
        userId="other-user"
        onRemove={onRemove}
      />
    );

    const badge = screen.getByText("원장");
    expect(badge.className).toContain("text-accent");
  });

  it("name이 없으면 email을 표시한다", () => {
    const member: Member = { ...baseMember, name: null };

    render(
      <MemberListItem
        member={member}
        myRole="admin"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    expect(screen.getByText("test@example.com")).toBeDefined();
  });

  it("name과 email이 없으면 userId 앞 8자리를 표시한다", () => {
    const member: Member = { ...baseMember, name: null, email: null };

    render(
      <MemberListItem
        member={member}
        myRole="admin"
        userId="owner-user"
        onRemove={onRemove}
      />
    );

    // userId is "user-abc" (8 chars), so slice(0,8) is "user-abc"
    expect(screen.getByText("user-abc")).toBeDefined();
  });
});
