import { expect, test } from "@playwright/test";

test.describe("Schedule 페이지 E2E 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/schedule");
  });

  test("시간표 페이지가 올바르게 로드되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator("h1")).toContainText("시간표");
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="student-panel"]')).toBeVisible();
  });

  test("시간표 그리드가 올바르게 표시되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();

    // 시간 슬롯들이 표시되는지 확인
    await expect(page.locator("text=09:00")).toBeVisible();
    await expect(page.locator("text=12:00")).toBeVisible();
    await expect(page.locator("text=18:00")).toBeVisible();
    await expect(page.locator("text=23:00")).toBeVisible();
  });

  test("요일 헤더가 올바르게 표시되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator("text=월요일")).toBeVisible();
    await expect(page.locator("text=화요일")).toBeVisible();
    await expect(page.locator("text=수요일")).toBeVisible();
    await expect(page.locator("text=목요일")).toBeVisible();
    await expect(page.locator("text=금요일")).toBeVisible();
  });

  test("학생 패널이 올바르게 표시되어야 한다", async ({ page }) => {
    // Assert
    await expect(page.locator('[data-testid="student-panel"]')).toBeVisible();
    await expect(page.locator("text=수강생")).toBeVisible();
  });

  test("드래그 앤 드롭으로 수업을 추가할 수 있어야 한다", async ({ page }) => {
    // Arrange - 먼저 학생과 과목이 있는지 확인하고 없으면 추가
    await page.goto("http://localhost:3000/students");
    await page.fill(
      'input[placeholder*="학생 이름 (검색 가능)"]',
      "테스트학생"
    );
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/subjects");
    await page.fill('input[placeholder*="과목 이름"]', "테스트과목");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // Act - 드래그 앤 드롭 시뮬레이션
    const studentElement = page.locator("text=테스트학생");
    const timeSlot = page.locator('[data-testid="time-slot"]').first();

    await studentElement.dragTo(timeSlot);

    // Assert
    await expect(page.locator('[data-testid="session-block"]')).toBeVisible();
  });

  test("수업 블록을 클릭하여 편집할 수 있어야 한다", async ({ page }) => {
    // Arrange - 수업이 있는 상태로 만들기
    await page.goto("http://localhost:3000/students");
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "편집학생");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/subjects");
    await page.fill('input[placeholder*="과목 이름"]', "편집과목");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // 수업 추가
    const studentElement = page.locator("text=편집학생");
    const timeSlot = page.locator('[data-testid="time-slot"]').first();
    await studentElement.dragTo(timeSlot);

    // Act
    await page.click('[data-testid="session-block"]');

    // Assert
    await expect(page.locator('[data-testid="session-modal"]')).toBeVisible();
  });

  test("수업 편집 모달이 올바르게 작동해야 한다", async ({ page }) => {
    // Arrange - 수업이 있는 상태로 만들기
    await page.goto("http://localhost:3000/students");
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "모달학생");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/subjects");
    await page.fill('input[placeholder*="과목 이름"]', "모달과목");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // 수업 추가
    const studentElement = page.locator("text=모달학생");
    const timeSlot = page.locator('[data-testid="time-slot"]').first();
    await studentElement.dragTo(timeSlot);

    // 수업 편집 모달 열기
    await page.click('[data-testid="session-block"]');

    // Assert
    await expect(page.locator('[data-testid="session-modal"]')).toBeVisible();
    await expect(page.locator("text=수업 편집")).toBeVisible();
  });

  test("수업을 삭제할 수 있어야 한다", async ({ page }) => {
    // Arrange - 수업이 있는 상태로 만들기
    await page.goto("http://localhost:3000/students");
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "삭제학생");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/subjects");
    await page.fill('input[placeholder*="과목 이름"]', "삭제과목");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // 수업 추가
    const studentElement = page.locator("text=삭제학생");
    const timeSlot = page.locator('[data-testid="time-slot"]').first();
    await studentElement.dragTo(timeSlot);

    // 수업 편집 모달 열기
    await page.click('[data-testid="session-block"]');

    // Act
    await page.click('button:has-text("삭제")');

    // Assert
    await expect(
      page.locator('[data-testid="session-block"]')
    ).not.toBeVisible();
  });

  test("학생 필터링이 작동해야 한다", async ({ page }) => {
    // Arrange - 여러 학생 추가
    await page.goto("http://localhost:3000/students");
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "필터학생1");
    await page.click('button:has-text("추가")');
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "필터학생2");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // Act - 학생 선택
    await page.click("text=필터학생1");

    // Assert
    await expect(page.locator('[data-testid="student-panel"]')).toContainText(
      "필터학생1"
    );
  });

  test("PDF 다운로드 버튼이 작동해야 한다", async ({ page }) => {
    // Act
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("PDF 다운로드")');
    const download = await downloadPromise;

    // Assert
    expect(download.suggestedFilename()).toContain("schedule");
  });

  test("페이지 새로고침 후에도 수업 데이터가 유지되어야 한다", async ({
    page,
  }) => {
    // Arrange - 수업 추가
    await page.goto("http://localhost:3000/students");
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "유지학생");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/subjects");
    await page.fill('input[placeholder*="과목 이름"]', "유지과목");
    await page.click('button:has-text("추가")');

    await page.goto("http://localhost:3000/schedule");

    // 수업 추가
    const studentElement = page.locator("text=유지학생");
    const timeSlot = page.locator('[data-testid="time-slot"]').first();
    await studentElement.dragTo(timeSlot);

    // Act
    await page.reload();

    // Assert
    await expect(page.locator('[data-testid="session-block"]')).toBeVisible();
  });

  test("반응형 디자인이 올바르게 작동해야 한다", async ({ page }) => {
    // Arrange
    await page.setViewportSize({ width: 375, height: 667 }); // 모바일 크기

    // Assert
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="student-panel"]')).toBeVisible();
  });

  test("네비게이션 메뉴가 올바르게 작동해야 한다", async ({ page }) => {
    // Act
    await page.click('a[href="/students"]');

    // Assert
    await expect(page).toHaveURL("http://localhost:3000/students");
  });

  test("다크 모드에서도 시간표가 올바르게 표시되어야 한다", async ({
    page,
  }) => {
    // Act
    await page.click('[data-testid="theme-toggle"]');

    // Assert
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/dark/);
  });
});
