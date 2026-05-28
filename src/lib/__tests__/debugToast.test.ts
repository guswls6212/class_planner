import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    custom: vi.fn(),
  },
}));

vi.mock("../../components/atoms/ToastContent", () => ({
  ToastContent: () => null,
}));

vi.mock("../../components/atoms/UndoToastContent", () => ({
  UndoToastContent: () => null,
}));

vi.mock("../../components/atoms/ActionToastContent", () => ({
  ActionToastContent: () => null,
}));

vi.mock("../notificationCenter", () => ({
  pushNotificationForCurrentUser: vi.fn(),
}));

const sendDebugEventSpy = vi.fn();
vi.mock("../observability/omni-radar", () => ({
  sendDebugEvent: sendDebugEventSpy,
}));

import { debugToast } from "../toast";
import { toast } from "sonner";

describe("debugToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // vi.unstubAllEnvs — vitest 가 모든 stubEnv 복원 (격리 의무)
    vi.unstubAllEnvs();
  });

  it("development 환경 — toast 표시 + sendDebugEvent 호출", async () => {
    vi.stubEnv("NODE_ENV", "development");

    debugToast("info", "test message", { category: "test" });

    expect(toast.custom).toHaveBeenCalledTimes(1);

    // sendDebugEvent 는 dynamic import 결과 — vi.waitFor 폴링 (조건 기반 wait)
    await vi.waitFor(() => {
      expect(sendDebugEventSpy).toHaveBeenCalledWith({
        level: "info",
        message: "test message",
        category: "test",
        metadata: undefined,
      });
    });
  });

  it("production 환경 + flag off — noop", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEBUG_TOAST", "");

    debugToast("success", "hidden in production");

    expect(toast.custom).not.toHaveBeenCalled();
    expect(sendDebugEventSpy).not.toHaveBeenCalled();
  });

  it("production 환경 + DEBUG_TOAST flag=1 — toast 표시 (escape hatch)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEBUG_TOAST", "1");

    debugToast("warning", "visible via flag");

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it("metadata + category 정상 forward", async () => {
    vi.stubEnv("NODE_ENV", "development");

    debugToast("success", "attendance moved", {
      category: "attendance-migrate",
      metadata: { sessionId: "abc", oldDate: "2026-05-27", newDate: "2026-05-28" },
    });

    await vi.waitFor(() => {
      expect(sendDebugEventSpy).toHaveBeenCalledWith({
        level: "success",
        message: "attendance moved",
        category: "attendance-migrate",
        metadata: {
          sessionId: "abc",
          oldDate: "2026-05-27",
          newDate: "2026-05-28",
        },
      });
    });
  });
});
