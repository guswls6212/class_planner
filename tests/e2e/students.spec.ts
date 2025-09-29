import { expect, test } from "@playwright/test";

test.describe("Students 페이지 E2E 테스트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/students");
  });

  test("학생 목록 페이지가 올바르게 로드되어야 한다", async ({ page }) => {
    // 페이지 제목 확인 (Next.js 기본 제목)
    await expect(page).toHaveTitle(/Class Planner/);

    // 헤더 확인
    await expect(page.locator("h2")).toContainText("학생 목록");

    // 학생 입력 섹션 확인
    await expect(
      page.locator('input[placeholder*="학생 이름 (검색 가능)"]')
    ).toBeVisible();
    await expect(page.locator('button:has-text("추가")')).toBeVisible();
  });

  test("새로운 학생을 추가할 수 있어야 한다", async ({ page }) => {
    // 학생 이름 입력
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");

    // 추가 버튼 클릭
    await page.click('button:has-text("추가")');

    // 학생이 목록에 추가되었는지 확인
    await expect(page.locator("text=김철수")).toBeVisible();

    // 입력창이 초기화되었는지 확인
    await expect(
      page.locator('input[placeholder*="학생 이름 (검색 가능)"]')
    ).toHaveValue("");
  });

  test("Enter 키로 학생을 추가할 수 있어야 한다", async ({ page }) => {
    // 학생 이름 입력
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김영희");

    // Enter 키 누르기
    await page.press('input[placeholder*="학생 이름 (검색 가능)"]', "Enter");

    // 학생이 목록에 추가되었는지 확인
    await expect(page.locator("text=김영희")).toBeVisible();
  });

  test("중복된 학생 이름을 추가하려고 하면 에러 메시지가 표시되어야 한다", async ({
    page,
  }) => {
    // 첫 번째 학생 추가
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");
    await page.click('button:has-text("추가")');

    // 같은 이름으로 다시 추가 시도
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");
    await page.click('button:has-text("추가")');

    // 에러 메시지 확인 (실제 구현에 따라 조정 필요)
    await expect(
      page.locator("text=이미 존재하는 학생 이름입니다")
    ).toBeVisible();
  });

  test("빈 이름으로 학생을 추가하려고 하면 에러 메시지가 표시되어야 한다", async ({
    page,
  }) => {
    // 빈 이름으로 추가 시도
    await page.click('button:has-text("추가")');

    // 에러 메시지 확인 (실제 구현에 따라 조정 필요)
    await expect(
      page.locator("text=학생 이름은 2글자 이상이어야 합니다")
    ).toBeVisible();
  });

  test("학생을 삭제할 수 있어야 한다", async ({ page }) => {
    // 학생 추가
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");
    await page.click('button:has-text("추가")');

    // 삭제 버튼 클릭 (실제 구현에 따라 조정 필요)
    await page.click('button:has-text("삭제")');

    // 확인 모달에서 삭제 확인 (실제 구현에 따라 조정 필요)
    await page.click('button:has-text("삭제")');

    // 학생이 목록에서 제거되었는지 확인
    await expect(page.locator("text=김철수")).not.toBeVisible();
  });

  test("학생 검색 기능이 작동해야 한다", async ({ page }) => {
    // 여러 학생 추가
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");
    await page.click('button:has-text("추가")');

    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김영희");
    await page.click('button:has-text("추가")');

    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "이민수");
    await page.click('button:has-text("추가")');

    // 검색 입력 (실제 구현에 따라 조정 필요)
    await page.fill('input[placeholder*="검색"]', "김");

    // 김씨 성을 가진 학생들만 표시되는지 확인
    await expect(page.locator("text=김철수")).toBeVisible();
    await expect(page.locator("text=김영희")).toBeVisible();
    await expect(page.locator("text=이민수")).not.toBeVisible();
  });

  test("학생 선택 기능이 작동해야 한다", async ({ page }) => {
    // 학생 추가
    await page.fill('input[placeholder*="학생 이름 (검색 가능)"]', "김철수");
    await page.click('button:has-text("추가")');

    // 학생 카드 클릭하여 선택 (실제 구현에 따라 조정 필요)
    await page.click("text=김철수");

    // 선택된 상태 확인 (실제 구현에 따라 조정 필요)
    await expect(page.locator("text=선택된 학생: 김철수")).toBeVisible();
  });

  test("반응형 디자인이 작동해야 한다", async ({ page }) => {
    // 데스크톱 크기에서 테스트
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator("h2")).toBeVisible();

    // 모바일 크기로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("h2")).toBeVisible();

    // 태블릿 크기로 변경
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("h2")).toBeVisible();
  });

  test("다크 모드 토글이 작동해야 한다", async ({ page }) => {
    // 다크 모드 토글 버튼 클릭 (실제 구현에 따라 조정 필요)
    await page.click('button:has-text("다크 모드")');

    // 다크 모드 클래스가 적용되었는지 확인 (실제 구현에 따라 조정 필요)
    await expect(page.locator("body")).toHaveClass(/dark/);

    // 다시 클릭하여 라이트 모드로 변경
    await page.click('button:has-text("라이트 모드")');

    // 라이트 모드 클래스가 적용되었는지 확인
    await expect(page.locator("body")).toHaveClass(/light/);
  });

  test("네비게이션이 올바르게 작동해야 한다", async ({ page }) => {
    // Subjects 페이지로 이동
    await page.click('nav a:has-text("과목")');
    await expect(page).toHaveURL("/subjects");

    // Schedule 페이지로 이동
    await page.click('nav a:has-text("시간표")');
    await expect(page).toHaveURL("/schedule");

    // Students 페이지로 다시 이동
    await page.click('nav a:has-text("학생")');
    await expect(page).toHaveURL("/students");
  });
});
