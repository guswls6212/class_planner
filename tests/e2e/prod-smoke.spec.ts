/**
 * Production Smoke — Stage D
 *
 * Tag: @prod-smoke. production build (next build && next start) 환경에서만
 * 도는 5 critical paths. dev mode 와 다른 production 특수성을 검증:
 *   - Service Worker 활성 (next-pwa serwist)
 *   - code splitting + first-load JS chunk
 *   - env.production 적용 (Supabase URL/anon key)
 *   - minification + bundle hash
 *
 * 실행:
 *   npm run test:release   # build + start + 본 spec
 *   npm run test:e2e:prod-smoke   # 이미 running prod server 가정
 *
 * BASE_URL override:
 *   PROD_BASE_URL=http://localhost:3100 playwright test --grep '@prod-smoke'
 *
 * 가이드 준수 (test-authoring-guide flaky 8 원칙):
 *   - waitForTimeout 사용 안 함 (expect.poll / toBeVisible({timeout}))
 *   - getByRole / locator("main") 안정 selector (CSS class 의존 X)
 *   - smoke 라 mutation 없음 — beforeEach state isolation 불필요
 */

import { expect, test } from "@playwright/test";

const PROD_BASE_URL = process.env.PROD_BASE_URL || "http://localhost:3100";

test.describe("@prod-smoke production critical paths", () => {
  test("1. Health — root page returns 200 + Class Planner title", async ({
    page,
  }) => {
    const response = await page.goto(PROD_BASE_URL + "/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Class Planner/i);
  });

  test("2. Anonymous /schedule loads with main shell", async ({ page }) => {
    const response = await page.goto(PROD_BASE_URL + "/schedule");
    expect(response?.status()).toBe(200);
    // production build minified — text content/CSS class 의존 회피.
    // main element 가시성만 검증 (AppShell 렌더 확인).
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("3. /about page renders (SEO landing surface)", async ({ page }) => {
    const response = await page.goto(PROD_BASE_URL + "/about");
    expect(response?.status()).toBe(200);
    await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });
  });

  test("4. /login page renders Google OAuth button (enabled)", async ({
    page,
  }) => {
    await page.goto(PROD_BASE_URL + "/login");
    const googleBtn = page.getByRole("button", {
      name: /Google.*계속하기|Google.*continue/i,
    });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
    await expect(googleBtn).toBeEnabled();
  });

  test("5. Service Worker registered (production-only)", async ({ page }) => {
    await page.goto(PROD_BASE_URL + "/");
    // serwist SW 는 production build 에서만 활성. dev 모드 에선 본 테스트 의도적 fail.
    // expect.poll 로 SW 등록 비동기 대기 — setTimeout polling 회피.
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            if (!("serviceWorker" in navigator)) return 0;
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length;
          }),
        { timeout: 5000, intervals: [200, 500, 1000] },
      )
      .toBeGreaterThan(0);
  });
});
