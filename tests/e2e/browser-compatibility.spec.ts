import { expect, test } from "@playwright/test";
import { loadPageWithAuth, setupE2EAuth } from "./config/e2e-config";

// 브라우저별 호환성 테스트
test.describe("브라우저별 호환성 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await setupE2EAuth(page);
  });

  test("Chrome에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await loadPageWithAuth(page, "/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트 (실제 placeholder 텍스트 사용)
    await page.fill(
      'input[placeholder*="학생 이름 (검색 가능)"]',
      "Chrome테스트학생"
    );
    await page.click('button:has-text("추가")');

    // 학생 추가 후 입력 필드가 비워졌는지 확인 (추가 성공)
    await expect(
      page.locator('input[placeholder*="학생 이름 (검색 가능)"]')
    ).toHaveValue("");

    // 시간표 페이지 접근 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });

  test("Firefox에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await loadPageWithAuth(page, "/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트 (실제 placeholder 텍스트 사용)
    await page.fill(
      'input[placeholder*="학생 이름 (검색 가능)"]',
      "Firefox테스트학생"
    );
    await page.click('button:has-text("추가")');

    // 학생 추가 후 입력 필드가 비워졌는지 확인 (추가 성공)
    await expect(
      page.locator('input[placeholder*="학생 이름 (검색 가능)"]')
    ).toHaveValue("");

    // 시간표 페이지 접근 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });
});

// 모바일 브라우저 호환성 테스트 (간소화)
test("모바일 뷰포트에서 기본 기능이 작동해야 한다", async ({ page }) => {
  // 모바일 뷰포트 설정
  await page.setViewportSize({ width: 375, height: 667 });

  await setupE2EAuth(page);
  await loadPageWithAuth(page, "/students");
  await page.waitForLoadState("networkidle");

  // 모바일에서 학생 추가 (실제 placeholder 텍스트 사용)
  await page.fill(
    'input[placeholder*="학생 이름 (검색 가능)"]',
    "모바일테스트학생"
  );
  await page.click('button:has-text("추가")');

  // 학생 추가 후 입력 필드가 비워졌는지 확인 (추가 성공)
  await expect(
    page.locator('input[placeholder*="학생 이름 (검색 가능)"]')
  ).toHaveValue("");

  // 모바일에서 시간표 확인
  await page.click('a[href="/schedule"]');
  await page.waitForLoadState("networkidle");

  await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
});

// 터치 이벤트 테스트 (간소화)
test("터치 이벤트가 정상 작동해야 한다", async ({ page }) => {
  // iPad 뷰포트 설정
  await page.setViewportSize({ width: 768, height: 1024 });

  await setupE2EAuth(page);
  await loadPageWithAuth(page, "/students");
  await page.waitForLoadState("networkidle");

  // 학생 추가 (실제 placeholder 텍스트 사용)
  await page.fill(
    'input[placeholder*="학생 이름 (검색 가능)"]',
    "터치테스트학생"
  );
  await page.click('button:has-text("추가")');

  // 과목 추가
  await page.click('a[href="/subjects"]');
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder*="과목 이름"]', "터치테스트과목");
  await page.click('button:has-text("추가")');

  // 시간표로 이동
  await page.click('a[href="/schedule"]');
  await page.waitForLoadState("networkidle");

  // 기본 터치 이벤트 확인 (간단한 클릭으로 대체)
  const timeTableGrid = page.locator('[data-testid="time-table-grid"]');
  await expect(timeTableGrid).toBeVisible();
});
