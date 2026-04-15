import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn().mockReturnValue({ from: vi.fn() });

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

describe("supabaseServiceRole", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
  });

  it("환경변수가 없으면 에러를 던진다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { getServiceRoleClient } = await import("../supabaseServiceRole");
    expect(() => getServiceRoleClient()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
    );
  });

  it("환경변수가 있으면 클라이언트를 생성한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const { getServiceRoleClient } = await import("../supabaseServiceRole");
    const client = getServiceRoleClient();

    expect(client).toBeDefined();
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      expect.objectContaining({
        auth: { autoRefreshToken: false, persistSession: false },
      })
    );
  });

  it("두 번째 호출에서 같은 싱글톤을 반환한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const { getServiceRoleClient } = await import("../supabaseServiceRole");
    const first = getServiceRoleClient();
    const second = getServiceRoleClient();

    expect(first).toBe(second);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});
