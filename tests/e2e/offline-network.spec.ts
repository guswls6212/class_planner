/**
 * Offline network e2e — page.context().setOffline() 시나리오에서
 * localStorage-first 보장 + 사용자 인지 가능한 indicator 동작 회귀 가드.
 *
 * 핵심:
 * - 익명 모드는 server sync 없음 → SyncStatusDot 시나리오는 인증 의존 (skip)
 * - 그러나 anonymous schedule에서 offline 전환 후 페이지 동작 자체는 정상이어야
 * - localStorage mutations은 offline에서도 동작 — fire-and-forget pattern
 *
 * Anonymous mode 전제 시 SyncStatusDot은 항상 idle → 시각 검증 어려움.
 * 이 spec은 "offline에서도 페이지가 깨지지 않는다" 수준 회귀 가드.
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
            id: "sess-offline",
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

test.describe("offline network behavior", () => {
  test("페이지 로드 후 offline 전환 → schedule 페이지 그대로 표시", async ({ page, context }) => {
    await seedSchedule(page);
    await page.goto("/schedule");
    await expect(page.getByTestId("session-block-sess-offline")).toBeVisible({ timeout: 10000 });

    await context.setOffline(true);

    // offline 전환 후에도 sessions 그대로 visible (localStorage 기반)
    await expect(page.getByTestId("session-block-sess-offline")).toBeVisible();

    // viewMode 토글 동작 — UI는 네트워크 없이도 동작
    await page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }).click();
    await expect(
      page.getByRole("group", { name: "뷰 모드" }).getByRole("button", { name: "월별" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("offline 전환 후 reload → schedule 페이지 정상 렌더 (localStorage 기반)", async ({
    page,
    context,
  }) => {
    await seedSchedule(page);
    await page.goto("/schedule");
    await expect(page.getByTestId("session-block-sess-offline")).toBeVisible({ timeout: 10000 });

    await context.setOffline(true);
    await page.reload();

    // localStorage data → 정상 렌더
    await expect(page.getByTestId("session-block-sess-offline")).toBeVisible({ timeout: 10000 });
  });

  test("offline 시 익명 사용자에게는 SyncStatusDot이 표시되지 않는다 — sync 없음", async ({
    page,
    context,
  }) => {
    await seedSchedule(page);
    await page.goto("/schedule");

    await context.setOffline(true);

    // 익명 모드 → useSyncStatus는 항상 "idle" → SyncStatusDot은 null 렌더
    // 5초 동안 dot이 나타나지 않음을 검증
    await expect(page.getByTestId("sync-status-dot")).not.toBeVisible({ timeout: 5000 });
  });
});
