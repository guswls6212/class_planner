import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import InviteModal from "../InviteModal";

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  userId: "user-123",
  onInviteCreated: vi.fn(),
};

const unlinkedTeachers = [
  { id: "teacher-1", name: "김철수", color: "#ff5733", userId: null },
  { id: "teacher-2", name: "이영희", color: "#33c4ff", userId: null },
];

const linkedTeachers = [
  { id: "teacher-linked", name: "박민준", color: "#aabbcc", userId: "some-user" },
];

describe("InviteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: unlinkedTeachers }),
    });
  });

  it("isOpen=false 일 때 렌더링하지 않는다", () => {
    render(<InviteModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("멤버 초대")).toBeNull();
  });

  it("isOpen=true 일 때 모달이 렌더링된다", () => {
    render(<InviteModal {...defaultProps} />);
    expect(screen.getByText("멤버 초대")).toBeDefined();
  });

  it("기본 역할이 'member'일 때 강사 드롭다운을 불러온다", async () => {
    render(<InviteModal {...defaultProps} />);

    // teacher fetch is triggered for 'member' role with unlinked=true server-side filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/teachers?userId=user-123&unlinked=true"
      );
    });
  });

  it("member 역할 선택 시 강사 드롭다운 레이블이 표시된다", async () => {
    render(<InviteModal {...defaultProps} />);

    // member role is already selected by default; wait for the label text
    await waitFor(() => {
      expect(screen.getByText(/연동할 강사 선택/)).toBeDefined();
    });
  });

  it("강사 목록이 로드되면 select에 옵션이 표시된다", async () => {
    render(<InviteModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeDefined();
    });

    const select = screen.getByRole("combobox");
    expect(select.querySelectorAll("option").length).toBe(2);
  });

  it("admin 역할 선택 시 강사 드롭다운이 숨겨진다", async () => {
    render(<InviteModal {...defaultProps} />);

    const adminRadio = screen.getByDisplayValue("admin");
    fireEvent.click(adminRadio);

    // Wait a tick to ensure state updates
    await waitFor(() => {
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(screen.queryByText(/연동할 강사 선택/)).toBeNull();
    });
  });

  it("연동 가능한 강사가 없을 때 안내 메시지를 표시한다", async () => {
    // Server returns empty list when ?unlinked=true and all teachers are already linked
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<InviteModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/먼저/)).toBeDefined();
      expect(screen.getByText(/강사를 추가해주세요/)).toBeDefined();
    });
  });

  it("강사가 없으면 '링크 생성' 버튼이 disabled 된다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<InviteModal {...defaultProps} />);

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /링크 생성/ });
      expect(submitButton).toHaveAttribute("disabled");
    });
  });

  it("취소 버튼 클릭 시 onClose가 호출된다", () => {
    render(<InviteModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("백드롭 클릭 시 onClose가 호출된다", () => {
    const { container } = render(<InviteModal {...defaultProps} />);

    // The backdrop is the outermost fixed div
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("이메일이 없는 강사 선택 시 노란 경고 메시지가 표시된다", async () => {
    const teacherWithNoEmail = [
      { id: "teacher-noemail", name: "홍길동", color: "#ff5733", email: null, userId: null },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: teacherWithNoEmail }),
    });

    render(<InviteModal {...defaultProps} />);

    // Wait for the teacher dropdown to load and auto-select the first (and only) teacher
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeDefined();
    });

    // The teacher with no email is auto-selected (first option); the warning should appear
    await waitFor(() => {
      expect(
        screen.getByText(/이 강사의 이메일이 등록되지 않았습니다/)
      ).toBeInTheDocument();
    });
  });
});
