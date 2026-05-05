/**
 * Login mobile e2e — viewport 375×667에서 OAuth 버튼 touch target 회귀 가드.
 *
 * Apple HIG: 최소 44×44px touch target. Google/카카오 버튼이 mobile에서 그 이상이어야.
 * 본 PR(U)에서 min-h-[44px] 추가 — class 회귀 시 fail.
 *
 * 익명 접근 — 별도 auth 불필요.
 */
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 667 } });

test.describe("login mobile (375×667)", () => {
  test("Google OAuth 버튼이 모바일 touch target 충족 (≥44px)", async ({ page }) => {
    await page.goto("/login");
    const googleBtn = page.getByRole("button", { name: /Google로 계속하기/ });
    await expect(googleBtn).toBeVisible({ timeout: 10000 });
    const box = await googleBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("카카오 button도 touch target 충족 (≥44px)", async ({ page }) => {
    await page.goto("/login");
    const kakaoBtn = page.getByRole("button", { name: /카카오로 계속하기/ });
    await expect(kakaoBtn).toBeVisible({ timeout: 10000 });
    const box = await kakaoBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("'둘러보기' 클릭 → /schedule 이동 (anonymous flow)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /둘러보기/ }).click();
    await expect(page).toHaveURL(/\/schedule/, { timeout: 10000 });
  });
});
