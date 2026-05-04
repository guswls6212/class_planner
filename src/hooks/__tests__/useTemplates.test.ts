import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useTemplates } from "../useTemplates";
import {
  FIXTURE_RAW_TEMPLATE,
  FIXTURE_TEMPLATE_DATA,
} from "@/__tests__/fixtures/template.fixture";

const mockTemplate = FIXTURE_RAW_TEMPLATE;

describe("useTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("userId=null 이면 fetchTemplates가 아무것도 하지 않는다", async () => {
    const { result } = renderHook(() => useTemplates(null));
    await act(async () => { await result.current.fetchTemplates(); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.templates).toHaveLength(0);
  });

  it("fetchTemplates 성공 시 templates 상태가 반영된다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockTemplate] }),
    });

    const { result } = renderHook(() => useTemplates("user-1"));
    await act(async () => { await result.current.fetchTemplates(); });

    expect(global.fetch).toHaveBeenCalledWith("/api/templates?userId=user-1");
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].id).toBe(FIXTURE_RAW_TEMPLATE.id);
    expect(result.current.templates[0].name).toBe(FIXTURE_RAW_TEMPLATE.name);
    expect(result.current.templates[0].templateData.sessions[0].teacherId).toBe("tc-1");
    expect(result.current.templates[0].templateData.sessions[0].teacherName).toBe("김선생");
  });

  it("fetchTemplates 중 isLoading이 true가 된다", async () => {
    let resolveFetch!: (v: unknown) => void;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((r) => { resolveFetch = r; })
    );

    const { result } = renderHook(() => useTemplates("user-1"));
    act(() => { result.current.fetchTemplates(); });
    expect(result.current.isLoading).toBe(true);
    resolveFetch({ ok: true, json: async () => ({ data: [] }) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("saveTemplate 성공 시 true를 반환하고 fetchTemplates를 재호출한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // re-fetch

    const { result } = renderHook(() => useTemplates("user-1"));
    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "새 템플릿",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });

    expect(ret).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("saveTemplate 실패 시 false를 반환한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useTemplates("user-1"));
    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "실패 템플릿",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toBe(false);
  });

  it("saveTemplate 네트워크 오류 시 false를 반환한다 (throw 안 함)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network failure")
    );

    const { result } = renderHook(() => useTemplates("user-1"));
    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "네트워크 실패",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it("updateTemplate 네트워크 오류 시 null을 반환한다 (throw 안 함)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network failure")
    );

    const { result } = renderHook(() => useTemplates("user-1"));
    let ret: unknown;
    await act(async () => {
      ret = await result.current.updateTemplate("tpl-1", {
        name: "네트워크 실패",
      });
    });
    expect(ret).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it("userId=null 이면 saveTemplate이 false를 반환한다", async () => {
    const { result } = renderHook(() => useTemplates(null));
    let ret: boolean | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "X",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
