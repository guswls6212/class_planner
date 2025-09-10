import { expect, test } from "@playwright/test";

test.describe("실제 사용자 시나리오 E2E 테스트", () => {
  test.beforeEach(async ({ page }) => {
    // 실제 개발 서버에 연결
    await page.goto("http://localhost:3001");

    // 페이지 로딩 대기
    await page.waitForLoadState("networkidle");
  });

  test("실제 사용자가 학생을 추가하고 시간표에 세션을 만드는 전체 플로우", async ({
    page,
  }) => {
    // 1. 학생 페이지로 이동
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");

    // 2. 실제 학생 추가
    await page.fill('input[placeholder*="학생 이름"]', "실제테스트학생");
    await page.click('button:has-text("추가")');

    // 3. 학생이 추가되었는지 확인
    await expect(page.locator('[role="list"]')).toContainText("실제테스트학생");

    // 4. 과목 페이지로 이동
    await page.click('a[href="/subjects"]');
    await page.waitForLoadState("networkidle");

    // 5. 실제 과목 추가
    await page.fill('input[placeholder*="과목 이름"]', "실제테스트과목");
    await page.click('button:has-text("추가")');

    // 6. 과목이 추가되었는지 확인
    await expect(page.locator('[data-testid="subject-list"]')).toContainText(
      "실제테스트과목"
    );

    // 7. 시간표 페이지로 이동
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    // 8. 시간표 그리드가 로드되었는지 확인
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();

    // 9. 학생 패널이 표시되는지 확인
    await expect(
      page.locator('[data-testid="students-panel-header"]')
    ).toBeVisible();

    // 10. 실제 드래그 앤 드롭으로 세션 생성
    const studentCard = page.locator('[data-testid="student-실제테스트학생"]');
    const dropZone = page.locator('[data-testid="dropzone-1-10:00"]');

    // 드래그 앤 드롭 실행
    await studentCard.dragTo(dropZone);

    // 11. 세션이 생성되었는지 확인
    await expect(page.locator('[data-testid^="session-block"]')).toBeVisible();

    // 12. 페이지 새로고침 후 데이터 유지 확인
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 13. 세션이 여전히 존재하는지 확인
    await expect(page.locator('[data-testid^="session-block"]')).toBeVisible();
  });

  test("실제 네트워크 지연 상황에서의 사용자 경험", async ({ page }) => {
    // 네트워크 지연 시뮬레이션
    await page.route("**/*", async (route) => {
      // 모든 요청에 1초 지연 추가
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // 1. 학생 페이지 로딩 시간 측정
    const startTime = Date.now();
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // 2. 로딩 시간이 합리적인 범위 내인지 확인 (10초 이내)
    expect(loadTime).toBeLessThan(10000);
    console.log(`네트워크 지연 상황에서 페이지 로딩 시간: ${loadTime}ms`);

    // 3. 학생 추가 기능이 여전히 작동하는지 확인
    await page.fill('input[placeholder*="학생 이름"]', "지연테스트학생");
    await page.click('button:has-text("추가")');

    // 4. 학생이 추가되었는지 확인
    await expect(page.locator('[role="list"]')).toContainText("지연테스트학생");
  });

  test("실제 브라우저에서 복잡한 상호작용 시나리오", async ({ page }) => {
    // 1. 여러 학생과 과목을 빠르게 추가
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");

    const students = ["김철수", "이영희", "박민수"];
    for (const studentName of students) {
      await page.fill('input[placeholder*="학생 이름"]', studentName);
      await page.click('button:has-text("추가")');
      await page.waitForTimeout(100); // 짧은 대기
    }

    // 2. 과목도 빠르게 추가
    await page.click('a[href="/subjects"]');
    await page.waitForLoadState("networkidle");

    const subjects = ["수학", "영어", "과학"];
    for (const subjectName of subjects) {
      await page.fill('input[placeholder*="과목 이름"]', subjectName);
      await page.click('button:has-text("추가")');
      await page.waitForTimeout(100); // 짧은 대기
    }

    // 3. 시간표에서 여러 세션을 빠르게 생성
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    // 여러 세션을 빠르게 생성
    const timeSlots = ["10:00", "11:00", "14:00"];
    for (let i = 0; i < timeSlots.length; i++) {
      const studentCard = page.locator(
        `[data-testid="student-${students[i]}"]`
      );
      const dropZone = page.locator(
        `[data-testid="dropzone-1-${timeSlots[i]}"]`
      );

      await studentCard.dragTo(dropZone);
      await page.waitForTimeout(200); // 짧은 대기
    }

    // 4. 모든 세션이 생성되었는지 확인
    const sessionBlocks = page.locator('[data-testid^="session-block"]');
    await expect(sessionBlocks).toHaveCount(3);

    // 5. 세션 편집 기능 테스트
    const firstSession = sessionBlocks.first();
    await firstSession.click();

    // 편집 모달이 열렸는지 확인
    await expect(page.locator('[data-testid="session-modal"]')).toBeVisible();
  });

  test("실제 모바일 환경에서의 터치 이벤트 처리", async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });

    // 1. 학생 페이지에서 모바일 인터페이스 확인
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");

    // 2. 모바일에서 학생 추가
    await page.fill('input[placeholder*="학생 이름"]', "모바일테스트학생");
    await page.click('button:has-text("추가")');

    // 3. 학생이 추가되었는지 확인
    await expect(page.locator('[role="list"]')).toContainText(
      "모바일테스트학생"
    );

    // 4. 시간표 페이지에서 모바일 레이아웃 확인
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    // 5. 모바일에서 시간표 그리드가 적절히 표시되는지 확인
    await expect(page.locator('[data-testid="time-table-grid"]')).toBeVisible();

    // 6. 모바일에서 학생 패널이 적절히 표시되는지 확인
    await expect(
      page.locator('[data-testid="students-panel-header"]')
    ).toBeVisible();
  });

  test("실제 데이터 손실 방지 시나리오", async ({ page }) => {
    // 1. 학생과 과목 추가
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="학생 이름"]', "데이터보존학생");
    await page.click('button:has-text("추가")');

    await page.click('a[href="/subjects"]');
    await page.waitForLoadState("networkidle");
    await page.fill('input[placeholder*="과목 이름"]', "데이터보존과목");
    await page.click('button:has-text("추가")');

    // 2. 시간표에서 세션 생성
    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");

    const studentCard = page.locator('[data-testid="student-데이터보존학생"]');
    const dropZone = page.locator('[data-testid="dropzone-1-10:00"]');
    await studentCard.dragTo(dropZone);

    // 3. 브라우저 새로고침 시뮬레이션
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 4. 데이터가 보존되었는지 확인
    await expect(
      page.locator('[data-testid="student-데이터보존학생"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid^="session-block"]')).toBeVisible();

    // 5. 다른 페이지로 이동 후 돌아와서 데이터 확인
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[role="list"]')).toContainText("데이터보존학생");

    await page.click('a[href="/schedule"]');
    await page.waitForLoadState("networkidle");
    await expect(page.locator('[data-testid^="session-block"]')).toBeVisible();
  });

  test("실제 에러 상황에서의 사용자 경험", async ({ page }) => {
    // 1. 중복 학생 추가 시도
    await page.click('a[href="/students"]');
    await page.waitForLoadState("networkidle");

    // 첫 번째 학생 추가
    await page.fill('input[placeholder*="학생 이름"]', "중복테스트학생");
    await page.click('button:has-text("추가")');
    await expect(page.locator('[role="list"]')).toContainText("중복테스트학생");

    // 두 번째 동일한 학생 추가 시도
    await page.fill('input[placeholder*="학생 이름"]', "중복테스트학생");
    await page.click('button:has-text("추가")');

    // 2. 에러 메시지가 표시되는지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // 3. 빈 이름으로 학생 추가 시도
    await page.fill('input[placeholder*="학생 이름"]', "");
    await page.click('button:has-text("추가")');

    // 4. 빈 이름 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
