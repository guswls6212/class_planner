/**
 * Mobile flows e2e — viewport 375×667에서 schedule 핵심 동작 회귀 가드.
 *
 * 모바일 트리거 동작:
 * - useScheduleView 모바일 default = "daily" (window.innerWidth < 768)
 * - DayChipBar 자동 표시 (일별 모드)
 * - SessionBlock의 long-press / tap 동작 (단순화 — 시각 검증만)
 *
 * Anonymous mode OK — 모든 시나리오 auth 없이 동작.
 */
import { expect, test, type Page } from "@playwright/test";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";

/**
 * 페이지가 보는 currentWeek와 정합 — schedule/page.tsx의 selectedDate는
 * `new Date()` (브라우저 timezone). KST 기준 weekStart로 seed하면 UTC 환경에서
 * 다른 주로 분류되어 ScheduleDailyView에 sess-mon 표시 안 됨.
 * 본 헬퍼는 브라우저 timezone의 monday를 반환 — CI/local 모두 페이지 currentWeek와 일치.
 */
function todayWeekStartLocal(): string {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}
const WEEK = todayWeekStartLocal();

test.use({ viewport: { width: 375, height: 667 } });

async function seedScheduleMobile(page: Page): Promise<void> {
  await page.addInitScript(
    ({ uid, week }) => {
      const payload = {
        students: [
          { id: "stu-1", name: "학생 A" },
          { id: "stu-2", name: "학생 B" },
        ],
        subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
        teachers: [],
        enrollments: [
          { id: "enr-1", studentId: "stu-1", subjectId: "sub-1" },
          { id: "enr-2", studentId: "stu-2", subjectId: "sub-1" },
        ],
        sessions: [
          {
            id: "sess-mon",
            subjectId: "sub-1",
            weekday: 0,
            startsAt: "09:00",
            endsAt: "10:00",
            weekStartDate: week,
            enrollmentIds: ["enr-1"],
            yPosition: 1,
          },
          {
            id: "sess-wed",
            subjectId: "sub-1",
            weekday: 2,
            startsAt: "14:00",
            endsAt: "15:00",
            weekStartDate: week,
            enrollmentIds: ["enr-2"],
            yPosition: 1,
          },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem("supabase_user_id", uid);
      localStorage.setItem(`classPlannerData:${uid}`, JSON.stringify(payload));
    },
    { uid: TEST_USER_ID, week: WEEK },
  );
}

test.describe("mobile schedule flows (375×667)", () => {
  test("모바일 viewport에서 schedule 페이지가 정상 로드된다 — viewMode default=daily", async ({
    page,
  }) => {
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    // useScheduleView: mobile (<768px) default = "daily"
    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "일별" }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 5000 });
  });

  test("일별 모드에서 DayChipBar가 표시된다", async ({ page }) => {
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    // DayChipBar — 0=월, 6=일 (data-testid는 PR A에서 추가)
    await expect(page.getByTestId("day-chip-0")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("day-chip-6")).toBeVisible({ timeout: 5000 });
  });

  test("DayChipBar에서 다른 요일 클릭 → 활성 chip 변경", async ({ page }) => {
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    // 수요일 (idx=2) chip 클릭
    const wedChip = page.getByTestId("day-chip-2");
    await expect(wedChip).toBeVisible({ timeout: 5000 });
    await wedChip.click();

    // data-active=true 속성으로 활성 검증 (CSS class 결합도 ↓)
    await expect(wedChip).toHaveAttribute("data-active", "true", { timeout: 3000 });
  });

  test("모바일에서 '주간' 모드로 변경 → SegmentedButton 변경 가능", async ({ page }) => {
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    await page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "주간" }).click();

    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "주간" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("모바일에서 일별 → 월별 → 일별 토글이 정상 동작", async ({ page }) => {
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    const group = page.getByRole("group", { name: "뷰 모드" });

    await group.getByRole("button", { name: "월별" }).click();
    await expect(group.getByRole("button", { name: "월별" })).toHaveAttribute("aria-pressed", "true");

    await group.getByRole("button", { name: "일별" }).click();
    await expect(group.getByRole("button", { name: "일별" })).toHaveAttribute("aria-pressed", "true");
  });

  test("모바일 일별 모드에서 SessionBlock visible — sess-mon (월요일 09:00)", async ({ page }) => {
    // PR E — seed의 weekStartDate를 브라우저 timezone monday로 정렬했으므로 페이지의
    // currentWeek와 일치 → ScheduleDailyView가 sess-mon 표시.
    await seedScheduleMobile(page);
    await page.goto("/schedule");

    const monChip = page.getByTestId("day-chip-0");
    await expect(monChip).toBeVisible({ timeout: 5000 });
    await monChip.click();

    // ScheduleDailyView mount 대기 (lazy load)
    await expect(page.getByTestId("session-block-sess-mon")).toBeVisible({ timeout: 10000 });
  });
});
