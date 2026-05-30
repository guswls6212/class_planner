/**
 * Share mobile e2e — viewport 375×667에서 학생/학부모용 share/[token] 페이지 회귀 가드.
 *
 * PWA 가치 핵심 지점 — 학부모가 모바일에서 자녀 시간표 확인.
 *
 * - GET /api/share/[token] mock으로 단순 데이터 셋업
 * - 학원명/라벨 visible
 * - 주간 view 단일 (일/월 view 제거됨 — 트래픽 안전망)
 *
 * Anonymous (인증 불필요) public route.
 */
import { expect, test, type Route } from "@playwright/test";

test.use({ viewport: { width: 375, height: 667 } });

const FIXTURE_TOKEN = "share-mobile-fixture-token";

test.describe("share mobile (375×667)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**/api/share/${FIXTURE_TOKEN}**`, async (route: Route) => {
      const url = route.request().url();
      if (url.includes("/view")) {
        // view 기록 endpoint
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            academyName: "테스트 학원",
            label: "5월 시간표",
            students: [{ id: "stu-1", name: "학생 A" }],
            subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
            enrollments: [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }],
            sessions: [],
            teachers: [],
            scheduleUpdatedAt: new Date().toISOString(),
            lastViewedAt: null,
            hasChanges: false,
          },
        }),
      });
    });
  });

  test("share 페이지가 모바일에서 정상 mount + 학원명 visible", async ({ page }) => {
    await page.goto(`/share/${FIXTURE_TOKEN}`);
    await expect(page.getByText("테스트 학원")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("5월 시간표")).toBeVisible();
  });

  test("주간 view 단일 — 일/월 SegmentedButton 미노출 + TimeTableGrid 표시", async ({ page }) => {
    await page.goto(`/share/${FIXTURE_TOKEN}`);
    await expect(page.getByText("테스트 학원")).toBeVisible({ timeout: 10000 });

    // 일별/월별 view 제거됨 — SegmentedButton (role="group") 자체 없어야 함
    await expect(page.getByRole("group")).toHaveCount(0);

    // 주간 view 단일 — TimeTableGrid 표시
    await expect(
      page.locator('[data-testid="time-table-grid"]')
    ).toBeVisible({ timeout: 5000 });

    // 하단 DayChipBar 도 제거됨 — nav 안 7 button 없어야 함
    await expect(page.locator("nav button")).toHaveCount(0);
  });
});
