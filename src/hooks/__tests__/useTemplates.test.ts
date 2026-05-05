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

// userId 가 비-null 인 hook 은 mount 시 자동으로 fetch 1회 호출.
// 본 헬퍼는 mount 응답을 미리 큐에 넣어 명시 호출 mock 과 분리한다.
const mountEmpty = (fetchMock: ReturnType<typeof vi.fn>) => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: [] }),
  });
};

describe("useTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  // ─── mount auto-fetch ──────────────────────────────────

  it("mount 시 userId 가 있으면 자동으로 fetchTemplates 호출된다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockTemplate] }),
    });

    const { result } = renderHook(() => useTemplates("user-1"));

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/templates?userId=user-1");
  });

  it("mount 시 userId=null 이면 fetch 호출하지 않는다", async () => {
    const { result } = renderHook(() => useTemplates(null));
    await act(async () => {});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.templates).toHaveLength(0);
  });

  it("userId 가 변경되면 자동으로 refetch 한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockTemplate] }),
      });

    const { result, rerender } = renderHook(
      ({ userId }: { userId: string | null }) => useTemplates(userId),
      { initialProps: { userId: null as string | null } }
    );
    expect(global.fetch).not.toHaveBeenCalled();

    rerender({ userId: "user-1" });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(result.current.templates).toHaveLength(0);

    rerender({ userId: "user-2" });
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("mount fetch 가 네트워크 오류여도 렌더 영향 없다 (silent)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network failure")
    );

    const { result } = renderHook(() => useTemplates("user-1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.templates).toHaveLength(0);
  });

  // ─── 기존 동작 (mount fetch 인지) ────────────────────────

  it("userId=null 이면 fetchTemplates가 아무것도 하지 않는다", async () => {
    const { result } = renderHook(() => useTemplates(null));
    await act(async () => { await result.current.fetchTemplates(); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.templates).toHaveLength(0);
  });

  it("fetchTemplates 성공 시 templates 상태가 반영된다", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockTemplate] }),
    });

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.fetchTemplates(); });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/templates?userId=user-1"
    );
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].id).toBe(FIXTURE_RAW_TEMPLATE.id);
    expect(result.current.templates[0].name).toBe(FIXTURE_RAW_TEMPLATE.name);
    expect(result.current.templates[0].templateData.sessions[0].teacherId).toBe(
      "tc-1"
    );
    expect(result.current.templates[0].templateData.sessions[0].teacherName).toBe(
      "김선생"
    );
  });

  it("fetchTemplates 중 isLoading이 true가 된다", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolveFetch!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((r) => { resolveFetch = r; })
    );

    act(() => { result.current.fetchTemplates(); });
    expect(result.current.isLoading).toBe(true);
    resolveFetch({ ok: true, json: async () => ({ data: [] }) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("saveTemplate 성공 시 true를 반환하고 fetchTemplates를 재호출한다", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // re-fetch

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ret: import("../useTemplates").SaveTemplateResult | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "새 템플릿",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });

    expect(ret).toEqual({ ok: true });
    // mount + POST + re-fetch = 3
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("saveTemplate 실패 시 ok:false reason:unknown 을 반환한다", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ret: import("../useTemplates").SaveTemplateResult | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "실패 템플릿",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toEqual({ ok: false, reason: "unknown" });
  });

  it("saveTemplate 이 403 + TEMPLATES_QUOTA_EXCEEDED 응답 시 reason:quota_exceeded 를 반환한다", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: "TEMPLATES_QUOTA_EXCEEDED",
        message: "프리 티어는 academy 당 최대 2개 템플릿까지 사용할 수 있습니다.",
      }),
    });

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ret: import("../useTemplates").SaveTemplateResult | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "쿼터 초과",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toEqual({ ok: false, reason: "quota_exceeded" });
    expect(result.current.isSaving).toBe(false);
  });

  it("saveTemplate 네트워크 오류 시 reason:unknown 을 반환한다 (throw 안 함)", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock.mockRejectedValueOnce(new Error("network failure"));

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ret: import("../useTemplates").SaveTemplateResult | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "네트워크 실패",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toEqual({ ok: false, reason: "unknown" });
    expect(result.current.isSaving).toBe(false);
  });

  it("updateTemplate 네트워크 오류 시 null을 반환한다 (throw 안 함)", async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    mountEmpty(fetchMock);
    fetchMock.mockRejectedValueOnce(new Error("network failure"));

    const { result } = renderHook(() => useTemplates("user-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ret: unknown;
    await act(async () => {
      ret = await result.current.updateTemplate("tpl-1", {
        name: "네트워크 실패",
      });
    });
    expect(ret).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it("userId=null 이면 saveTemplate이 ok:false reason:unknown 을 반환한다", async () => {
    const { result } = renderHook(() => useTemplates(null));
    let ret: import("../useTemplates").SaveTemplateResult | undefined;
    await act(async () => {
      ret = await result.current.saveTemplate({
        name: "X",
        description: "",
        templateData: FIXTURE_TEMPLATE_DATA,
      });
    });
    expect(ret).toEqual({ ok: false, reason: "unknown" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
