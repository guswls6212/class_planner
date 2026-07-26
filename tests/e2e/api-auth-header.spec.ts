/**
 * fetch 인터셉터가 진짜 브라우저에서 `/api/*` 요청에 세션 토큰을 붙이는지 검증.
 *
 * 왜 e2e 인가: 인터셉터는 `RootProviders` **모듈 최상단**에서 설치된다 (React
 * effect 는 자식 → 부모 순이라 effect 안에서 설치하면 자식의 첫 fetch 를 놓친다).
 * 그 설치가 실제 번들 로드 시점에 이뤄지는지는 jsdom 이 아니라 브라우저에서만
 * 확인된다 — 틀리면 첫 요청이 토큰 없이 나가 그 기능이 401 로 죽는다.
 *
 * 범위: **인터셉터 동작**. 로그인 앱 플로우 전체는 injectRealSession 을 쓰는 기존
 * spec 들(teachers-crud / multi-academy / templates-apply-delete 등)이 CI 에서 덮는다.
 * 여기선 자격증명 없이 돌도록 세션을 직접 심고, 페이지 컨텍스트에서 fetch 를
 * 호출해 나가는 요청의 헤더만 본다 — 서버 응답(401)은 관심사가 아니다.
 *
 * 2026-07-26 P0 후속 (ADR-026 § 4).
 */
import { expect, test, type Page } from "@playwright/test";

const FAKE_ACCESS_TOKEN = "e2e-interceptor-access-token";

/**
 * SDK 가 실제로 쓰는 storage key 로 세션을 심는다.
 * 키를 하드코딩하면 안 된다 — `sb-{projectRef}-auth-token` 의 ref 는 환경마다
 * 다르고, 틀린 키에 쓰면 getSession() 이 못 찾아 테스트가 조용히 무의미해진다.
 */
async function seedSession(page: Page): Promise<void> {
  const storageKey = await page.evaluate(() => {
    const sb = (window as unknown as { supabase?: { auth?: { storageKey?: string } } })
      .supabase;
    return sb?.auth?.storageKey ?? null;
  });
  expect(storageKey, "supabase auth storageKey 를 읽지 못했다").toBeTruthy();

  await page.evaluate(
    ([key, token]) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: "e2e-interceptor-refresh-token",
          token_type: "bearer",
          // 만료가 임박하면 SDK 가 갱신을 시도한다 — 넉넉히 미래로.
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            aud: "authenticated",
            role: "authenticated",
          },
        })
      );
    },
    [storageKey as string, FAKE_ACCESS_TOKEN] as const
  );

  // SDK 는 초기화 시 storage 를 읽으므로 reload 후에야 세션을 인지한다.
  await page.reload({ waitUntil: "domcontentloaded" });
}

/** 페이지 컨텍스트에서 fetch 를 실행하고, 그 요청에 실린 Authorization 을 돌려준다. */
async function authHeaderFor(page: Page, path: string): Promise<string | null> {
  const seen = new Promise<string | null>((resolve) => {
    const onRequest = (req: { url(): string; headers(): Record<string, string> }) => {
      if (!new URL(req.url()).pathname.endsWith(path)) return;
      page.off("request", onRequest);
      resolve(req.headers()["authorization"] ?? null);
    };
    page.on("request", onRequest);
  });

  await page.evaluate((target) => void fetch(target).catch(() => undefined), path);
  return seen;
}

test.describe("fetch 인터셉터 — /api 요청의 Authorization 헤더", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
  });

  test("인터셉터가 모듈 로드 시점에 설치된다 (effect 아님)", async ({ page }) => {
    const patched = await page.evaluate(
      () => !/\{\s*\[native code\]\s*\}/.test(String(window.fetch))
    );
    expect(patched, "window.fetch 가 native — 인터셉터 미설치").toBe(true);
  });

  test("세션이 있으면 same-origin /api/* 에 Bearer 가 붙는다", async ({ page }) => {
    await seedSession(page);

    expect(await authHeaderFor(page, "/api/students")).toBe(
      `Bearer ${FAKE_ACCESS_TOKEN}`
    );
    expect(await authHeaderFor(page, "/api/sessions")).toBe(
      `Bearer ${FAKE_ACCESS_TOKEN}`
    );
  });

  test("logger 싱크(/api/logs/client)에는 붙지 않는다 — 재귀 방지", async ({ page }) => {
    await seedSession(page);
    expect(await authHeaderFor(page, "/api/logs/client")).toBeNull();
  });

  test("/api 가 아닌 same-origin 경로에는 붙지 않는다", async ({ page }) => {
    await seedSession(page);
    expect(await authHeaderFor(page, "/manifest.webmanifest")).toBeNull();
  });

  test("세션이 없으면 헤더 없이 나간다 — 익명 경로 보존", async ({ page }) => {
    expect(await authHeaderFor(page, "/api/students")).toBeNull();
  });
});
