/**
 * Schedule view mode e2e — 일별/주간/월별 토글 + localStorage persist 회귀 가드.
 *
 * 핵심:
 * - SegmentedButton aria-label="뷰 모드" — 일별/주간/월별 3 버튼
 * - viewMode === "daily" → ScheduleDailyView mount
 * - viewMode === "monthly" → ScheduleMonthlyView mount
 * - localStorage key `ui:scheduleView` 에 persist
 * - useScheduleView 모바일 default = "daily" (window.innerWidth < 768)
 *
 * Anonymous mode에서 모든 시나리오 동작 — auth 의존 없음.
 */
import { expect, test, type Page } from "@playwright/test";
import { currentWeekMondayKST } from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const WEEK = currentWeekMondayKST();

async function seedSchedule(page: Page): Promise<void> {
  await page.addInitScript(
    ({ uid, week }) => {
      const payload = {
        students: [{ id: "stu-1", name: "학생 A" }],
        subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
        teachers: [],
        enrollments: [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }],
        sessions: [
          {
            id: "sess-1",
            subjectId: "sub-1",
            weekday: 0,
            startsAt: "09:00",
            endsAt: "10:00",
            weekStartDate: week,
            enrollmentIds: ["enr-1"],
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

test.describe("schedule view mode toggle", () => {
  test("뷰 모드 SegmentedButton 3 버튼이 보인다 — 일별/주간/월별", async ({ page }) => {
    await seedSchedule(page);
    await page.goto("/schedule");

    const group = page.getByRole("group", { name: "뷰 모드" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("button", { name: "일별" })).toBeVisible();
    await expect(group.getByRole("button", { name: "주간" })).toBeVisible();
    await expect(group.getByRole("button", { name: "월별" })).toBeVisible();
  });

  test("'월별' 클릭 → aria-pressed=true + localStorage `ui:scheduleView`=monthly", async ({
    page,
  }) => {
    await seedSchedule(page);
    await page.goto("/schedule");

    await page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }).click();

    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }),
    ).toHaveAttribute("aria-pressed", "true");

    const stored = await page.evaluate(() => localStorage.getItem("ui:scheduleView"));
    expect(stored).toContain("monthly");
  });

  test("'일별' 클릭 → DayChipBar(요일 칩 바) 표시", async ({ page }) => {
    await seedSchedule(page);
    await page.goto("/schedule");

    await page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "일별" }).click();

    // schedule/page.tsx — 일별 모드에선 DayChipBar 렌더 (월/화/수/.../일 chip)
    // DayChipBar 텍스트로 식별 가능
    await expect(page.getByRole("button", { name: /^월\d+$/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test("뷰 모드 변경 후 페이지 reload → 마지막 모드가 복원된다", async ({ page }) => {
    await seedSchedule(page);
    await page.goto("/schedule");

    await page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }).click();
    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();

    // localStorage에 persist되었으므로 reload 후에도 월별이 active
    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 5000 });
  });
});
