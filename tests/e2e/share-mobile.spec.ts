/**
 * Share mobile e2e — viewport 375×667에서 학생/학부모용 share/[token] 페이지 회귀 가드.
 *
 * PWA 가치 핵심 지점 — 학부모가 모바일에서 자녀 시간표 확인.
 *
 * - GET /api/share/[token] mock으로 단순 데이터 셋업
 * - SegmentedButton 모바일 라벨 ("일/주/월") 가시성
 * - 학원명/라벨 visible
 * - DayChipBar (일별 모드) 표시
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

  test("SegmentedButton 모바일 라벨 '일/주/월' 노출 (long form 'X별' 숨김)", async ({ page }) => {
    await page.goto(`/share/${FIXTURE_TOKEN}`);
    // 페이지 mount 대기
    await expect(page.getByText("테스트 학원")).toBeVisible({ timeout: 10000 });

    // role="group" 안의 button name accessible name은 long+short text 합쳐짐 (DOM 모두 존재)
    // 따라서 visible 검증만 — 모바일에선 short("일")만 visible.
    const segGroup = page.getByRole("group");
    await expect(segGroup).toBeVisible();

    // 정확히 short "일", "주", "월" 텍스트 노드가 visible (CSS hidden sm:inline → hidden 처리)
    // 단순 검증: short text가 있어야
    await expect(segGroup.getByText("일", { exact: true })).toBeVisible();
    await expect(segGroup.getByText("주", { exact: true })).toBeVisible();
    await expect(segGroup.getByText("월", { exact: true })).toBeVisible();
  });

  test("일별 모드에서 DayChipBar (하단 탭) 표시", async ({ page }) => {
    await page.goto(`/share/${FIXTURE_TOKEN}`);
    await expect(page.getByText("테스트 학원")).toBeVisible({ timeout: 10000 });

    // share/[token]/page.tsx의 일별 모드 하단 nav: 7개 weekday 라벨 (월~일).
    // selector: nav[role=button] 또는 텍스트 "월", "화", ... 중 하나라도.
    // 모바일이 default daily — DayChipBar 즉시 visible.
    const navTabs = page.locator("nav button");
    await expect(navTabs).toHaveCount(7, { timeout: 5000 });
  });
});
