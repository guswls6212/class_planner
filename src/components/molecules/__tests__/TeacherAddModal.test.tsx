import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(window.navigator, "clipboard", {
  configurable: true,
  value: { writeText: mockWriteText },
});

// Mock toast helpers
const mockShowError = vi.fn();
vi.mock("@/lib/toast", () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
  showSuccess: vi.fn(),
  showToast: vi.fn(),
}));

import { TeacherAddModal } from "../TeacherAddModal";

const defaultProps = {
  open: true,
  userId: "user-123",
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

describe("TeacherAddModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockShowError.mockReset();
    mockWriteText.mockClear();
  });

  it("open=false 일 때 렌더링하지 않는다", () => {
    render(<TeacherAddModal {...defaultProps} open={false} />);
    expect(screen.queryByText("강사 추가")).toBeNull();
  });

  it("open=true 일 때 모달이 렌더링된다", () => {
    render(<TeacherAddModal {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "강사 추가" })).toBeInTheDocument();
  });

  it("이메일이 비어있을 때 — 2-button mode (공유 링크 + 일단 추가만)", () => {
    render(<TeacherAddModal {...defaultProps} />);

    expect(screen.getByRole("button", { name: /추가 \+ 공유 링크 발급/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /일단 추가만$/ })).toBeInTheDocument();
    // 3-button-mode buttons should NOT exist
    expect(screen.queryByRole("button", { name: /추가 \+ 초대 링크 생성/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /추가 \+ 시간표 공유 링크만/ })).toBeNull();
  });

  it("이메일을 입력하면 — 3-button mode (초대 링크 / 공유 링크 / 일단 추가)", () => {
    render(<TeacherAddModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("park@example.com");
    fireEvent.change(emailInput, { target: { value: "park@example.com" } });

    expect(screen.getByRole("button", { name: /추가 \+ 초대 링크 생성/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /추가 \+ 시간표 공유 링크만/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /일단 추가만 \(나중에 결정\)/ })).toBeInTheDocument();
    // No-email-mode primary should not exist
    expect(screen.queryByRole("button", { name: /추가 \+ 공유 링크 발급/ })).toBeNull();
  });

  it("이메일 힌트가 입력 여부에 따라 변경된다", () => {
    render(<TeacherAddModal {...defaultProps} />);

    expect(screen.getByText("이메일을 입력하면 초대 보안이 강화됩니다")).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText("park@example.com");
    fireEvent.change(emailInput, { target: { value: "park@example.com" } });

    expect(
      screen.getByText(/park@example.com\s*으로 초대 링크를 특정합니다 \(보안\)/)
    ).toBeInTheDocument();
  });

  it("이름 없이 제출하면 에러를 표시하고 fetch가 호출되지 않는다", async () => {
    render(<TeacherAddModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /추가 \+ 공유 링크 발급/ }));

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled();
    });
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringMatching(/강사 이름을 입력/)
    );
  });

  it("이메일 없이 '추가 + 공유 링크 발급' 클릭 시 — POST teachers + POST share-tokens", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: "new-t1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: "share-1" } }),
      });

    render(<TeacherAddModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("예: 김강사"), {
      target: { value: "박강사" },
    });
    fireEvent.click(screen.getByRole("button", { name: /추가 \+ 공유 링크 발급/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    const calls = mockFetch.mock.calls;
    expect(calls[0][0]).toBe("/api/teachers?userId=user-123");
    expect(calls[1][0]).toBe("/api/share-tokens?userId=user-123");

    const shareBody = JSON.parse(calls[1][1].body);
    expect(shareBody.teacherId).toBe("new-t1");
    expect(shareBody.expiresInDays).toBe(30);

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it("이메일 입력 후 '추가 + 초대 링크 생성' 클릭 시 — POST teachers + POST invites + 클립보드 복사", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: "new-t2" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { token: "tok-x" } }),
      });

    render(<TeacherAddModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("예: 김강사"), {
      target: { value: "이강사" },
    });
    fireEvent.change(screen.getByPlaceholderText("park@example.com"), {
      target: { value: "lee@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /추가 \+ 초대 링크 생성/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    const calls = mockFetch.mock.calls;
    expect(calls[0][0]).toBe("/api/teachers?userId=user-123");
    expect(calls[1][0]).toBe("/api/invites?userId=user-123");

    const teacherBody = JSON.parse(calls[0][1].body);
    expect(teacherBody.email).toBe("lee@example.com");

    const inviteBody = JSON.parse(calls[1][1].body);
    expect(inviteBody.role).toBe("member");
    expect(inviteBody.teacherId).toBe("new-t2");

    // Verify the invite link was auto-copied to clipboard
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringMatching(/\/invite\/tok-x$/)
      );
    });
  });

  it("'일단 추가만' 클릭 시 — POST teachers만 호출", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: "new-t3" } }),
    });

    render(<TeacherAddModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("예: 김강사"), {
      target: { value: "최강사" },
    });
    fireEvent.click(screen.getByRole("button", { name: /일단 추가만$/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    expect(mockFetch.mock.calls[0][0]).toBe("/api/teachers?userId=user-123");
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it("취소 버튼 클릭 시 onClose가 호출된다", () => {
    render(<TeacherAddModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
