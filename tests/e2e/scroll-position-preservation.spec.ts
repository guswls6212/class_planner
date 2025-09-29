import { expect, test } from "@playwright/test";

test.describe("스크롤 위치 보존 E2E 테스트", () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 전 localStorage 초기화
    await page.goto("/schedule");
    await page.evaluate(() => {
      localStorage.removeItem("schedule_scroll_position");
    });
  });

  test("세션 드래그앤드롭 후 스크롤 위치가 유지되어야 한다", async ({
    page,
  }) => {
    await page.goto("/schedule");

    // 로그인 처리 (필요한 경우)
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    // 시간표 그리드가 로드될 때까지 대기
    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 1. 스크롤을 18:00 위치로 이동
    const gridElement = page.locator('[data-testid="time-table-grid"]');

    // 가로 스크롤을 오른쪽으로 이동 (18:00 위치로)
    await gridElement.evaluate((element) => {
      // 18:00은 대략 9시간 * 2 (30분 단위) = 18번째 컬럼
      // 각 컬럼이 100px이므로 18 * 100 = 1800px 정도
      element.scrollLeft = 1800;
    });

    // 스크롤 위치가 저장될 때까지 잠시 대기
    await page.waitForTimeout(500);

    // 2. 저장된 스크롤 위치 확인
    const savedScrollPosition = await page.evaluate(() => {
      const saved = localStorage.getItem("schedule_scroll_position");
      return saved ? JSON.parse(saved) : null;
    });

    expect(savedScrollPosition).toBeTruthy();
    expect(savedScrollPosition.scrollLeft).toBeGreaterThan(1000);

    // 3. 세션이 있는지 확인하고 드래그앤드롭 실행
    const sessionBlocks = page.locator('[data-testid*="session-block"]');
    const sessionCount = await sessionBlocks.count();

    if (sessionCount > 0) {
      // 첫 번째 세션을 드래그
      const firstSession = sessionBlocks.first();
      const targetDropZone = page.locator('[data-testid="drop-zone"]').first();

      // 드래그앤드롭 실행
      await firstSession.dragTo(targetDropZone);

      // 드래그 완료 후 잠시 대기
      await page.waitForTimeout(1000);

      // 4. 스크롤 위치가 유지되었는지 확인
      const currentScrollLeft = await gridElement.evaluate(
        (element) => element.scrollLeft
      );

      // 스크롤 위치가 유지되어야 함 (약간의 차이는 허용)
      expect(currentScrollLeft).toBeGreaterThan(1500);
    }
  });

  test("페이지 새로고침 후 스크롤 위치가 복원되어야 한다", async ({ page }) => {
    await page.goto("/schedule");

    // 로그인 처리
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 1. 스크롤을 21:00 위치로 이동
    const gridElement = page.locator('[data-testid="time-table-grid"]');

    await gridElement.evaluate((element) => {
      // 21:00은 대략 12시간 * 2 = 24번째 컬럼
      element.scrollLeft = 2400;
    });

    await page.waitForTimeout(500);

    // 2. 페이지 새로고침
    await page.reload();
    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 3. 스크롤 위치가 복원되었는지 확인
    const restoredScrollLeft = await gridElement.evaluate(
      (element) => element.scrollLeft
    );

    // 스크롤 위치가 복원되어야 함
    expect(restoredScrollLeft).toBeGreaterThan(2000);
  });

  test("5분 이내의 스크롤 위치만 복원되어야 한다", async ({ page }) => {
    // 1. 오래된 스크롤 위치 데이터를 localStorage에 저장
    await page.evaluate(() => {
      const oldData = {
        scrollLeft: 3000,
        scrollTop: 0,
        timestamp: Date.now() - 10 * 60 * 1000, // 10분 전
      };
      localStorage.setItem("schedule_scroll_position", JSON.stringify(oldData));
    });

    await page.goto("/schedule");

    // 로그인 처리
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 2. 스크롤 위치가 복원되지 않았는지 확인 (기본 위치 0 근처)
    const gridElement = page.locator('[data-testid="time-table-grid"]');
    const currentScrollLeft = await gridElement.evaluate(
      (element) => element.scrollLeft
    );

    // 오래된 데이터는 복원되지 않아야 함
    expect(currentScrollLeft).toBeLessThan(500);
  });

  test("세션 드래그 중 스크롤 위치가 변경되지 않아야 한다", async ({
    page,
  }) => {
    await page.goto("/schedule");

    // 로그인 처리
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 1. 특정 스크롤 위치로 이동
    const gridElement = page.locator('[data-testid="time-table-grid"]');
    await gridElement.evaluate((element) => {
      element.scrollLeft = 1500;
    });

    await page.waitForTimeout(300);

    // 2. 드래그 시작 전 스크롤 위치 기록
    const scrollBeforeDrag = await gridElement.evaluate(
      (element) => element.scrollLeft
    );

    // 3. 세션 드래그 시작 (드래그만 시작, 드롭하지 않음)
    const sessionBlocks = page.locator('[data-testid*="session-block"]');
    const sessionCount = await sessionBlocks.count();

    if (sessionCount > 0) {
      const firstSession = sessionBlocks.first();

      // 드래그 시작
      await firstSession.hover();
      await page.mouse.down();

      // 드래그 중 스크롤 위치 확인
      await page.waitForTimeout(100);
      const scrollDuringDrag = await gridElement.evaluate(
        (element) => element.scrollLeft
      );

      // 드래그 취소
      await page.mouse.up();

      // 4. 드래그 중에도 스크롤 위치가 유지되어야 함
      expect(scrollDuringDrag).toBe(scrollBeforeDrag);
    }
  });

  test("여러 번의 드래그앤드롭 후에도 스크롤 위치가 유지되어야 한다", async ({
    page,
  }) => {
    await page.goto("/schedule");

    // 로그인 처리
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 1. 스크롤 위치 설정
    const gridElement = page.locator('[data-testid="time-table-grid"]');
    await gridElement.evaluate((element) => {
      element.scrollLeft = 2000;
    });

    await page.waitForTimeout(500);

    // 2. 여러 번의 드래그앤드롭 실행
    const sessionBlocks = page.locator('[data-testid*="session-block"]');
    const sessionCount = await sessionBlocks.count();

    if (sessionCount > 1) {
      for (let i = 0; i < 3; i++) {
        const session = sessionBlocks.nth(i % sessionCount);
        const targetDropZone = page
          .locator('[data-testid="drop-zone"]')
          .nth((i + 1) % 3);

        await session.dragTo(targetDropZone);
        await page.waitForTimeout(500);
      }

      // 3. 최종 스크롤 위치 확인
      const finalScrollLeft = await gridElement.evaluate(
        (element) => element.scrollLeft
      );

      // 스크롤 위치가 유지되어야 함
      expect(finalScrollLeft).toBeGreaterThan(1800);
    }
  });

  test("localStorage 오류 시에도 앱이 정상 동작해야 한다", async ({ page }) => {
    // localStorage를 비활성화
    await page.route("**/*", (route) => {
      route.continue();
    });

    // localStorage 접근을 차단
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: () => {
            throw new Error("localStorage access denied");
          },
          setItem: () => {
            throw new Error("localStorage access denied");
          },
          removeItem: () => {},
          clear: () => {},
        },
      });
    });

    await page.goto("/schedule");

    // 로그인 처리
    const loginButton = page.locator('button:has-text("로그인")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForURL("/schedule");
    }

    // 앱이 정상적으로 로드되어야 함
    await page.waitForSelector('[data-testid="time-table-grid"]', {
      timeout: 10000,
    });

    // 스크롤이 정상적으로 작동해야 함
    const gridElement = page.locator('[data-testid="time-table-grid"]');
    await gridElement.evaluate((element) => {
      element.scrollLeft = 1000;
    });

    const scrollLeft = await gridElement.evaluate(
      (element) => element.scrollLeft
    );
    expect(scrollLeft).toBe(1000);
  });
});
