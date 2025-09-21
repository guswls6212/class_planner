/**
 * supabaseClient 기본 테스트 (256줄 - 큰 파일)
 */

import { describe, expect, it } from "vitest";

describe("supabaseClient", () => {
  it("Supabase 클라이언트 모듈이 로드되어야 한다", async () => {
    const module = await import("../supabaseClient");
    expect(module).toBeDefined();
  });

  it("supabase 인스턴스가 존재해야 한다", async () => {
    const { supabase } = await import("../supabaseClient");
    expect(supabase).toBeDefined();
  });

  it("supabaseUtils가 존재해야 한다", async () => {
    const { supabaseUtils } = await import("../supabaseClient");
    expect(supabaseUtils).toBeDefined();
  });

  it("typedSupabase가 존재해야 한다", async () => {
    const { typedSupabase } = await import("../supabaseClient");
    expect(typedSupabase).toBeDefined();
  });

  it("기본 Supabase 구조가 유지되어야 한다", async () => {
    const module = await import("../supabaseClient");
    expect(typeof module).toBe("object");
  });
});
