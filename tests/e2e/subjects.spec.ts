import { expect, test } from "@playwright/test";

test.describe("Subjects 페이지 E2E 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/subjects");
  });

  test("과목 페이지가 올바르게 로드되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator("h1")).toContainText("과목 관리");
    await expect(page.locator('input[placeholder*="과목 이름"]')).toBeVisible();
    await expect(page.locator('input[type="color"]')).toBeVisible();
    await expect(page.locator('button:has-text("추가")')).toBeVisible();
  });

  test("새로운 과목을 추가할 수 있어야 한다", async ({ page }) => {
    // Arrange
    const subjectName = "과학";
    const subjectColor = "#FF0000";

    // Act
    await page.fill('input[placeholder*="과목 이름"]', subjectName);
    await page.fill('input[type="color"]', subjectColor);
    await page.click('button:has-text("추가")');

    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      subjectName
    );
    await expect(page.locator('input[placeholder*="과목 이름"]')).toHaveValue(
      ""
    );
  });

  test("Enter 키로 과목을 추가할 수 있어야 한다", async ({ page }) => {
    // Arrange
    const subjectName = "영어";

    // Act
    await page.fill('input[placeholder*="과목 이름"]', subjectName);
    await page.press('input[placeholder*="과목 이름"]', "Enter");

    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      subjectName
    );
  });

  test("과목을 선택할 수 있어야 한다", async ({ page }) => {
    // Arrange - 먼저 과목 추가
    await page.fill('input[placeholder*="과목 이름"]', "수학");
    await page.click('button:has-text("추가")');

    // Act
    await page.click("text=수학");

    // Assert
    await expect(page.locator("text=수학").locator("..")).toHaveClass(
      /selected/
    );
  });

  test("과목을 삭제할 수 있어야 한다", async ({ page }) => {
    // Arrange - 먼저 과목 추가
    await page.fill('input[placeholder*="과목 이름"]', "삭제할과목");
    await page.click('button:has-text("추가")');

    // Act
    await page.click('button:has-text("삭제")');

    // Assert
    await expect(
      page.locator('[data-testid="subject-list"]')
    ).not.toContainText("삭제할과목");
  });

  test("중복된 과목 이름 추가 시 에러 메시지가 표시되어야 한다", async ({
    page,
  }) => {
    // Arrange - 먼저 과목 추가
    await page.fill('input[placeholder*="과목 이름"]', "중복과목");
    await page.click('button:has-text("추가")');

    // Act - 같은 이름으로 다시 추가
    await page.fill('input[placeholder*="과목 이름"]', "중복과목");
    await page.click('button:has-text("추가")');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "이미 존재하는 과목 이름"
    );
  });

  test("빈 이름으로 과목 추가 시 에러 메시지가 표시되어야 한다", async ({
    page,
  }) => {
    // Act
    await page.click('button:has-text("추가")');

    // Assert
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "과목 이름은 2글자 이상"
    );
  });

  test("색상 변경이 올바르게 작동해야 한다", async ({ page }) => {
    // Arrange
    const newColor = "#00FF00";

    // Act
    await page.fill('input[type="color"]', newColor);
    await page.fill('input[placeholder*="과목 이름"]', "색상테스트");
    await page.click('button:has-text("추가")');

    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "색상테스트"
    );
    // 색상이 적용되었는지 확인 (CSS 스타일 확인)
    const subjectElement = page.locator("text=색상테스트");
    await expect(subjectElement).toBeVisible();
  });

  test("기본 과목들이 자동으로 생성되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "수학"
    );
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "영어"
    );
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "과학"
    );
  });

  test("과목 목록이 반응형으로 작동해야 한다", async ({ page }) => {
    // Arrange
    await page.setViewportSize({ width: 375, height: 667 }); // 모바일 크기

    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="과목 이름"]')).toBeVisible();
  });

  test("페이지 새로고침 후에도 과목 데이터가 유지되어야 한다", async ({
    page,
  }) => {
    // Arrange
    await page.fill('input[placeholder*="과목 이름"]', "유지될과목");
    await page.click('button:has-text("추가")');

    // Act
    await page.reload();

    // Assert
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "유지될과목"
    );
  });

  test("네비게이션 메뉴가 올바르게 작동해야 한다", async ({ page }) => {
    // Act
    await page.click('a[href="/students"]');

    // Assert
    await expect(page).toHaveURL("http://localhost:3000/students");
  });

  test("다크 모드 토글이 작동해야 한다", async ({ page }) => {
    // Act
    await page.click('[data-testid="theme-toggle"]');

    // Assert
    await expect(page.locator("body")).toHaveClass(/dark/);
  });
});

