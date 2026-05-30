import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SyncStatusDot from "../SyncStatusDot";
import { __resetSyncStateForTests } from "@/lib/apiSync";

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

describe("SyncStatusDot", () => {
  beforeEach(() => {
    __resetSyncStateForTests();
  });

  afterEach(() => {
    __resetSyncStateForTests();
  });

  it("idle 상태 — 아무것도 렌더하지 않음 (시각 노이즈 0)", () => {
    const { container } = render(<SyncStatusDot />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("sync-status-dot")).toBeNull();
  });
});
