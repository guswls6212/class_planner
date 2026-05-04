import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/apiSync", () => ({
  getContextLabel: (ctx: string) => {
    const map: Record<string, string> = {
      "session:update": "수업 위치 변경",
      "session:create": "수업 추가",
    };
    return map[ctx] ?? "변경";
  },
}));

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

const mockEntries: Array<{
  id: string;
  context: string;
  method: string;
  url: string;
  body?: unknown;
  queuedAt: string;
  lastError?: string;
}> = [];

vi.mock("@/lib/syncOutbox", () => ({
  getOutboxEntries: vi.fn(() => mockEntries),
  removeOutboxEntry: vi.fn(),
  flushOutboxEntry: vi.fn(),
  flushOutbox: vi.fn(),
}));

import SyncQueueModal from "../SyncQueueModal";
import * as syncOutbox from "@/lib/syncOutbox";

describe("SyncQueueModal", () => {
  beforeEach(() => {
    mockEntries.length = 0;
    vi.clearAllMocks();
  });

  it("isOpen=false → 렌더링 X", () => {
    const { container } = render(
      <SyncQueueModal isOpen={false} onClose={vi.fn()} userId="u1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("isOpen=true + 빈 큐 → '대기 중인 항목이 없습니다'", () => {
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    expect(screen.getByTestId("sync-queue-modal")).toBeInTheDocument();
    expect(screen.getByText(/대기 중인 항목이 없습니다/)).toBeInTheDocument();
    // footer (재시도/버리기 버튼)는 entries 있을 때만 표시
    expect(screen.queryByTestId("sync-queue-retry-all")).toBeNull();
  });

  it("Recovery 안내 텍스트 노출 (Option C 통합)", () => {
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    expect(
      screen.getByText(/화면엔 보이지만/),
    ).toBeInTheDocument();
  });

  it("entries 있을 때 — 항목별 라벨 + 시간 + lastError 표시", () => {
    mockEntries.push({
      id: "session:update:s1",
      context: "session:update",
      method: "PUT",
      url: "/api/sessions/s1?userId=u1",
      queuedAt: "2026-05-04T03:00:00.000Z",
      lastError: "HTTP 500",
    });
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    expect(screen.getByText("수업 위치 변경")).toBeInTheDocument();
    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    // url에서 query 제거된 형태로 표시
    expect(screen.getByText(/PUT \/api\/sessions\/s1$/)).toBeInTheDocument();
  });

  it("[재시도] 클릭 → flushOutboxEntry 호출", async () => {
    mockEntries.push({
      id: "session:update:s1",
      context: "session:update",
      method: "PUT",
      url: "/x",
      queuedAt: "2026-05-04T03:00:00.000Z",
    });
    vi.mocked(syncOutbox.flushOutboxEntry).mockResolvedValue(true);
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    fireEvent.click(screen.getByTestId("sync-queue-retry-session:update:s1"));
    await waitFor(() =>
      expect(syncOutbox.flushOutboxEntry).toHaveBeenCalledWith(
        "u1",
        "session:update:s1",
      ),
    );
  });

  it("[버리기] 클릭 → removeOutboxEntry 호출", () => {
    mockEntries.push({
      id: "session:update:s1",
      context: "session:update",
      method: "PUT",
      url: "/x",
      queuedAt: "2026-05-04T03:00:00.000Z",
    });
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    fireEvent.click(screen.getByTestId("sync-queue-discard-session:update:s1"));
    expect(syncOutbox.removeOutboxEntry).toHaveBeenCalledWith(
      "u1",
      "session:update:s1",
    );
  });

  it("[모두 재시도] 클릭 → flushOutbox 호출", async () => {
    mockEntries.push({
      id: "x",
      context: "session:update",
      method: "PUT",
      url: "/x",
      queuedAt: "2026-05-04T03:00:00.000Z",
    });
    vi.mocked(syncOutbox.flushOutbox).mockResolvedValue({
      sent: 1,
      failed: 0,
      expired: 0,
    });
    render(<SyncQueueModal isOpen={true} onClose={vi.fn()} userId="u1" />);
    fireEvent.click(screen.getByTestId("sync-queue-retry-all"));
    await waitFor(() =>
      expect(syncOutbox.flushOutbox).toHaveBeenCalledWith("u1"),
    );
  });

  it("close 버튼 클릭 → onClose 호출", () => {
    const onClose = vi.fn();
    render(<SyncQueueModal isOpen={true} onClose={onClose} userId="u1" />);
    fireEvent.click(screen.getByTestId("sync-queue-modal-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
