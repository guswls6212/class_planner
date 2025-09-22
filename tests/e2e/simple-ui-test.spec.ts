import { expect, test } from "@playwright/test";

/**
 * 간단한 UI 테스트 (인증 없이 접근 가능한 페이지만)
 */
test.describe("간단한 UI 테스트", () => {
  test("홈페이지가 로드되어야 한다", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("domcontentloaded");

    // 홈페이지 기본 요소 확인
    await expect(page.locator("h1")).toContainText("클래스 플래너");
    console.log("✅ 홈페이지 로드 성공");
  });

  test("로그인 페이지가 로드되어야 한다", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.waitForLoadState("domcontentloaded");

    // 로그인 페이지 기본 요소 확인 (h1은 "클래스 플래너", h2가 "로그인")
    await expect(page.locator("h1")).toContainText("클래스 플래너");
    await expect(page.locator("h2")).toContainText("로그인");
    console.log("✅ 로그인 페이지 로드 성공");
  });

  test("소개 페이지가 로드되어야 한다", async ({ page }) => {
    await page.goto("http://localhost:3000/about");
    await page.waitForLoadState("domcontentloaded");

    // 소개 페이지 기본 요소 확인
    await expect(page.locator("h1")).toContainText("클래스 플래너");
    console.log("✅ 소개 페이지 로드 성공");
  });

  test("네비게이션이 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("domcontentloaded");

    // 소개 페이지로 이동
    await page.click('a[href="/about"]');
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText("클래스 플래너");
    console.log("✅ 네비게이션 성공");
  });
});
