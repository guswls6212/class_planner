import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useAttendance } from "../useAttendance";

const SAMPLE_RECORD = {
  id: "att-1",
  session_id: "sess-1",
  student_id: "stu-1",
  date: "2026-04-17",
  status: "present",
  notes: null,
};

describe("useAttendance", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("fetchAttendance 호출 후 attendance 상태가 업데이트된다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [SAMPLE_RECORD] }),
    });

    const { result } = renderHook(() => useAttendance("user-1"));

    await act(async () => {
      await result.current.fetchAttendance("sess-1", "2026-04-17");
    });

    expect(result.current.attendance["sess-1"]["stu-1"].status).toBe("present");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("attendance"),
      undefined
    );
  });

  it("markAttendance 호출 후 해당 학생의 상태가 업데이트된다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { ...SAMPLE_RECORD, status: "absent" } }),
    });

    const { result } = renderHook(() => useAttendance("user-1"));

    await act(async () => {
      await result.current.markAttendance("sess-1", "stu-1", "2026-04-17", "absent");
    });

    expect(result.current.attendance["sess-1"]["stu-1"].status).toBe("absent");
  });

  it("markAllPresent 호출 후 모든 학생이 present 상태가 된다", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { ...SAMPLE_RECORD, student_id: "stu-1", status: "present" },
          { ...SAMPLE_RECORD, student_id: "stu-2", status: "present" },
        ],
      }),
    });

    const { result } = renderHook(() => useAttendance("user-1"));

    await act(async () => {
      await result.current.markAllPresent("sess-1", ["stu-1", "stu-2"], "2026-04-17");
    });

    expect(result.current.attendance["sess-1"]["stu-1"].status).toBe("present");
    expect(result.current.attendance["sess-1"]["stu-2"].status).toBe("present");
  });

  it("userId 없으면 fetch 호출하지 않는다", async () => {
    const { result } = renderHook(() => useAttendance(null));

    await act(async () => {
      await result.current.fetchAttendance("sess-1", "2026-04-17");
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
