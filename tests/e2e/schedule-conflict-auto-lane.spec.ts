/**
 * Schedule conflict auto-lane e2e — 같은 시간대 충돌 sessions이 별도 lane으로 자동 분리되어
 * 시각적으로 모두 표시되는지 회귀 가드.
 *
 * 비즈니스 로직: src/lib/sessionCollisionUtils.ts repositionSessions().
 *   - 같은 weekday + 같은 yPosition + 시간 겹침 → 자동으로 yPosition 증가
 *   - 시각적으로는 horizontal lane 분리 (left + width 변경)
 * 단위 테스트: sessionCollisionUtils.test.ts에서 함수 동작 검증.
 * E2E 가드: 시드된 충돌 sessions이 둘 다 visible — 어느 하나도 가려지지 않는다.
 *
 * data-testid 활용: SessionBlock에 `session-block-${id}` 부여됨 (SessionBlock.tsx:376).
 */
import { expect, test, type Page } from "@playwright/test";
import { currentWeekMondayKST } from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const WEEK = currentWeekMondayKST();

interface SeedSession {
  id: string;
  subjectId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  weekStartDate: string;
  enrollmentIds: string[];
  yPosition: number;
}

async function seedSessions(page: Page, sessions: SeedSession[]): Promise<void> {
  await page.addInitScript(
    ({ uid, sessionsArg }) => {
      const payload = {
        students: [
          { id: "stu-1", name: "학생 A" },
          { id: "stu-2", name: "학생 B" },
          { id: "stu-3", name: "학생 C" },
        ],
        subjects: [
          { id: "sub-1", name: "수학", color: "#7DD3FC" },
          { id: "sub-2", name: "영어", color: "#86EFAC" },
        ],
        teachers: [],
        enrollments: [
          { id: "enr-1", studentId: "stu-1", subjectId: "sub-1" },
          { id: "enr-2", studentId: "stu-2", subjectId: "sub-1" },
          { id: "enr-3", studentId: "stu-3", subjectId: "sub-2" },
        ],
        sessions: sessionsArg,
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem("supabase_user_id", uid);
      localStorage.setItem(`classPlannerData:${uid}`, JSON.stringify(payload));
    },
    { uid: TEST_USER_ID, sessionsArg: sessions },
  );
}

test.describe("schedule — conflict auto-lane visual", () => {
  test("같은 weekday + 시간 겹침 + 다른 yPosition인 sessions 둘 다 visible", async ({ page }) => {
    await seedSessions(page, [
      {
        id: "sess-A",
        subjectId: "sub-1",
        weekday: 0, // 월요일
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
      {
        id: "sess-B",
        subjectId: "sub-2",
        weekday: 0, // 월요일 같은 시간
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-3"],
        yPosition: 2, // 다른 lane
      },
    ]);

    await page.goto("/schedule");

    // 두 SessionBlock 모두 화면에 보여야 한다 — auto-lane이 작동했다는 시각 증거
    await expect(page.getByTestId("session-block-sess-A")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("session-block-sess-B")).toBeVisible({ timeout: 10000 });
  });

  test("3개 충돌 sessions이 yPosition 1/2/3로 시드 → 모두 visible", async ({ page }) => {
    await seedSessions(page, [
      {
        id: "sess-1",
        subjectId: "sub-1",
        weekday: 1, // 화요일
        startsAt: "14:00",
        endsAt: "15:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
      {
        id: "sess-2",
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "14:00",
        endsAt: "15:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-2"],
        yPosition: 2,
      },
      {
        id: "sess-3",
        subjectId: "sub-2",
        weekday: 1,
        startsAt: "14:00",
        endsAt: "15:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-3"],
        yPosition: 3,
      },
    ]);

    await page.goto("/schedule");

    await expect(page.getByTestId("session-block-sess-1")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("session-block-sess-2")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("session-block-sess-3")).toBeVisible({ timeout: 10000 });
  });

  test("같은 weekday이지만 시간 안 겹치는 sessions은 같은 yPosition 가능 — 둘 다 표시", async ({
    page,
  }) => {
    await seedSessions(page, [
      {
        id: "sess-morning",
        subjectId: "sub-1",
        weekday: 2, // 수요일
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
      {
        id: "sess-afternoon",
        subjectId: "sub-2",
        weekday: 2,
        startsAt: "14:00",
        endsAt: "15:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-3"],
        yPosition: 1, // 같은 lane이지만 시간이 안 겹치므로 OK
      },
    ]);

    await page.goto("/schedule");

    await expect(page.getByTestId("session-block-sess-morning")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("session-block-sess-afternoon")).toBeVisible({ timeout: 10000 });
  });

  test("충돌 sessions 2개 중 한 lane은 좌측, 다른 lane은 우측에 위치 — left offset 차이", async ({
    page,
  }) => {
    await seedSessions(page, [
      {
        id: "sess-left",
        subjectId: "sub-1",
        weekday: 3, // 목요일
        startsAt: "10:00",
        endsAt: "11:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
      {
        id: "sess-right",
        subjectId: "sub-2",
        weekday: 3,
        startsAt: "10:00",
        endsAt: "11:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-3"],
        yPosition: 2,
      },
    ]);

    await page.goto("/schedule");
    const leftBlock = page.getByTestId("session-block-sess-left");
    const rightBlock = page.getByTestId("session-block-sess-right");
    await expect(leftBlock).toBeVisible({ timeout: 10000 });
    await expect(rightBlock).toBeVisible({ timeout: 10000 });

    const leftBox = await leftBlock.boundingBox();
    const rightBox = await rightBlock.boundingBox();
    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();

    // yPosition이 다르면 horizontal하게 분리 — x 좌표가 달라야 한다
    expect(Math.abs(leftBox!.x - rightBox!.x)).toBeGreaterThan(0);
    // 같은 시간대 → y 좌표는 비슷해야 (수직으로 같은 row)
    expect(Math.abs(leftBox!.y - rightBox!.y)).toBeLessThan(5);
  });
});
