import { expect, test } from "@playwright/test";

// pre-deploy에서 실행되는 최소 스모크 시나리오
test("real user scenarios - smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  // 헤더 존재 여부로 최소 렌더링 확인
  await expect(page.locator("header, nav, main").first()).toBeVisible({
    timeout: 5000,
  });
});
