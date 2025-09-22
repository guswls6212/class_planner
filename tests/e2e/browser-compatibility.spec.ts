import { devices, expect, test } from "@playwright/test";

// 브라우저별 호환성 테스트
test.describe("브라우저별 호환성 테스트", () => {
  test("Chrome에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트
    await page.fill('input[placeholder*="학생 이름"]', "Chrome테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "Chrome테스트학생"
    );

    // 시간표 페이지 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });

  test("Firefox에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트
    await page.fill('input[placeholder*="학생 이름"]', "Firefox테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "Firefox테스트학생"
    );

    // 시간표 페이지 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });

  test("Safari에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트
    await page.fill('input[placeholder*="학생 이름"]', "Safari테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "Safari테스트학생"
    );

    // 시간표 페이지 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });

  test("Edge에서 기본 기능이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // 학생 추가 테스트
    await page.fill('input[placeholder*="학생 이름"]', "Edge테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "Edge테스트학생"
    );

    // 시간표 페이지 테스트
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });
});

// 모바일 브라우저 호환성 테스트
test.describe("모바일 브라우저 호환성 테스트", () => {
  test.use({ ...devices["iPhone 12"] });

  test("iPhone에서 모바일 인터페이스가 정상 작동해야 한다", async ({
    page,
  }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // 모바일에서 학생 추가
    await page.fill('input[placeholder*="학생 이름"]', "iPhone테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "iPhone테스트학생"
    );

    // 모바일에서 시간표 확인
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();

    // 모바일에서 학생 패널 확인
    await expect(
      page.locator('[data-testid="students-panel-header"]')
    ).toBeVisible();
  });

  test.use({ ...devices["Pixel 5"] });

  test("Android에서 모바일 인터페이스가 정상 작동해야 한다", async ({
    page,
  }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // Android에서 학생 추가
    await page.fill('input[placeholder*="학생 이름"]', "Android테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "Android테스트학생"
    );

    // Android에서 시간표 확인
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();
  });
});

// 터치 이벤트 테스트
test.describe("터치 이벤트 테스트", () => {
  test.use({ ...devices["iPad"] });

  test("iPad에서 터치 이벤트가 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/schedule");
    await page.waitForLoadState("networkidle");

    // 학생 추가
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="학생 이름"]', "iPad테스트학생");
    await page.click('button:has-text("추가")');

    // 과목 추가
    await page.click('a[href="/subjects"]');
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="과목 이름"]', "iPad테스트과목");
    await page.click('button:has-text("추가")');

    // 시간표로 이동
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    // 터치로 드래그 앤 드롭 시뮬레이션
    const studentCard = page.locator('[data-testid="student-iPad테스트학생"]');
    const dropZone = page.locator('[data-testid="dropzone-1-10:00"]');

    // 터치 시작
    await studentCard.tap();

    // 드래그 앤 드롭
    await studentCard.dragTo(dropZone);

    // 세션이 생성되었는지 확인
    await expect(page.locator('[data-testid^="session-block"]')).toBeVisible();
  });
});

// 접근성 테스트
test.describe("접근성 테스트", () => {
  test("키보드 네비게이션이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // Tab 키로 네비게이션
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Enter 키로 학생 추가
    await page.keyboard.type("키보드테스트학생");
    await page.keyboard.press("Enter");

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "키보드테스트학생"
    );
  });

  test("스크린 리더 호환성이 정상 작동해야 한다", async ({ page }) => {
    await page.goto("http://localhost:3001/students");
    await page.waitForLoadState("networkidle");

    // aria-label이 있는 요소들 확인
    const input = page.locator('input[placeholder*="학생 이름"]');
    await expect(input).toHaveAttribute("placeholder");

    const button = page.locator('button:has-text("추가")');
    await expect(button).toBeVisible();

    // 학생 추가 후 리스트 확인
    await page.fill('input[placeholder*="학생 이름"]', "스크린리더테스트학생");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "스크린리더테스트학생"
    );
  });
});

// 성능 테스트
test.describe("브라우저별 성능 테스트", () => {
  test("Chrome에서 페이지 로딩 성능이 적절해야 한다", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("http://localhost:3001/schedule");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // 5초 이내에 로딩되어야 함
    expect(loadTime).toBeLessThan(5000);
    console.log(`Chrome 로딩 시간: ${loadTime}ms`);
  });

  test("Firefox에서 페이지 로딩 성능이 적절해야 한다", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("http://localhost:3001/schedule");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // 5초 이내에 로딩되어야 함
    expect(loadTime).toBeLessThan(5000);
    console.log(`Firefox 로딩 시간: ${loadTime}ms`);
  });

  test("Safari에서 페이지 로딩 성능이 적절해야 한다", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("http://localhost:3001/schedule");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // 5초 이내에 로딩되어야 함
    expect(loadTime).toBeLessThan(5000);
    console.log(`Safari 로딩 시간: ${loadTime}ms`);
  });
});

