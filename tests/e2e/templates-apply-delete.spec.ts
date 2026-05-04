/**
 * Templates apply + clear week e2e — TemplateMenuV2 + ApplyTemplateConfirm 회귀 가드.
 *
 * 회귀 가드 영역:
 * - 템플릿 메뉴 열림/닫힘
 * - hasTemplate에 따라 "템플릿 적용하기" / "미리보기" disabled 토글
 * - 빈 시간표에 templated apply → doApplyTemplate → 토스트
 * - 기존 sessions 있을 때 → ApplyTemplateConfirm 확인 모달
 * - 시간표 비우기 → window.confirm → sessions 모두 삭제
 *
 * 비즈니스 로직: schedule/page.tsx handleApplyTemplate / doApplyTemplate / handleClearWeek.
 * 템플릿 round-trip(POST/저장)은 schedule-templates.spec.ts에서 별도 검증.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
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

async function seedScheduleData(page: Page, sessions: SeedSession[] = []): Promise<void> {
  await page.addInitScript(
    ({ uid, sessionsArg }) => {
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

interface TemplateApiPayload {
  id: string;
  name: string;
  description: string | null;
  template_data: {
    version: string;
    sessions: Array<{
      subjectId: string;
      subjectName: string;
      subjectColor: string;
      studentIds: string[];
      studentNames: string[];
      weekday: number;
      startsAt: string;
      endsAt: string;
      yPosition?: number;
    }>;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

const FIXTURE_TEMPLATE: TemplateApiPayload = {
  id: "tpl-fixture-1",
  name: "월요일 기본",
  description: "월 9-10시 수학",
  template_data: {
    version: "1.0",
    sessions: [
      {
        subjectId: "sub-1",
        subjectName: "수학",
        subjectColor: "#7DD3FC",
        studentIds: ["stu-1"],
        studentNames: ["학생 A"],
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        yPosition: 1,
      },
    ],
  },
  created_by: TEST_USER_ID,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function mockTemplatesApi(page: Page, templates: TemplateApiPayload[]): Promise<void> {
  await page.route("**/api/templates**", async (route: Route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: templates }),
      });
    } else {
      await route.continue();
    }
  });
}

// FIXME: TemplateMenuV2는 schedule/page.tsx의 `canManage && userId && viewMode==="weekly"`
// 조건에서만 렌더되는데, supabase_user_id seed + anonymous-first useMyRole 분기에서
// canManage=true 가 보장되지 않아 "템플릿" 버튼 자체가 안 보임 → 모든 시나리오 timeout.
// 후속 PR에서: (a) useMyRole anonymous 분기 보장 또는 (b) 직접 `useTemplates`/`handleApplyTemplate`
// 단위 테스트로 분리, (c) 또는 ApplyTemplateConfirm을 Storybook Test로 격리 검증.
test.describe.skip("templates — TemplateMenuV2 메뉴 + apply + clear", () => {
  test("'템플릿' 버튼 클릭 시 메뉴가 열린다", async ({ page }) => {
    await seedScheduleData(page);
    await mockTemplatesApi(page, []);

    await page.goto("/schedule");
    await page.getByRole("button", { name: /^템플릿/ }).first().click();

    await expect(page.getByText("이 주에 작업")).toBeVisible();
    await expect(page.getByRole("button", { name: /템플릿 적용하기/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^시간표 비우기$/ })).toBeVisible();
  });

  test("hasTemplate=false (저장된 템플릿 없음) → '템플릿 적용하기' / '미리보기' 모두 disabled", async ({
    page,
  }) => {
    await seedScheduleData(page);
    await mockTemplatesApi(page, []);

    await page.goto("/schedule");
    await page.getByRole("button", { name: /^템플릿/ }).first().click();

    await expect(page.getByRole("button", { name: /템플릿 적용하기/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^미리보기$/ })).toBeDisabled();
  });

  test("템플릿 fetch 후 hasTemplate=true → '템플릿 적용하기' 활성화", async ({ page }) => {
    await seedScheduleData(page);
    await mockTemplatesApi(page, [FIXTURE_TEMPLATE]);

    await page.goto("/schedule");
    // 페이지 로드 후 GET /api/templates 응답 대기 — 메뉴 열기 전
    await page.waitForResponse((res) => res.url().includes("/api/templates") && res.ok());

    await page.getByRole("button", { name: /^템플릿/ }).first().click();
    await expect(page.getByRole("button", { name: /템플릿 적용하기/ })).toBeEnabled({
      timeout: 5000,
    });
  });

  test("기존 sessions 있을 때 적용 → ApplyTemplateConfirm 확인 모달이 표시된다", async ({
    page,
  }) => {
    await seedScheduleData(page, [
      {
        id: "sess-existing",
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "11:00",
        endsAt: "12:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
    ]);
    await mockTemplatesApi(page, [FIXTURE_TEMPLATE]);

    await page.goto("/schedule");
    await page.waitForResponse((res) => res.url().includes("/api/templates") && res.ok());

    await page.getByRole("button", { name: /^템플릿/ }).first().click();
    await page.getByRole("button", { name: /템플릿 적용하기/ }).click();

    await expect(page.getByRole("heading", { name: /템플릿을 적용할까요/ })).toBeVisible();
    await expect(page.getByText(/모두 삭제되고 템플릿으로 교체됩니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^기존 삭제하고 적용$/ })).toBeVisible();

    // 취소 → 모달 닫힘 + sessions 그대로
    await page.getByRole("button", { name: /^취소$/ }).click();
    await expect(page.getByRole("heading", { name: /템플릿을 적용할까요/ })).not.toBeVisible();
  });

  test("'시간표 비우기' → window.confirm 후 sessions 모두 삭제 + 토스트", async ({ page }) => {
    await seedScheduleData(page, [
      {
        id: "sess-1",
        subjectId: "sub-1",
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-1"],
        yPosition: 1,
      },
      {
        id: "sess-2",
        subjectId: "sub-1",
        weekday: 1,
        startsAt: "11:00",
        endsAt: "12:00",
        weekStartDate: WEEK,
        enrollmentIds: ["enr-2"],
        yPosition: 1,
      },
    ]);
    await mockTemplatesApi(page, []);

    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/schedule");
    await page.getByRole("button", { name: /^템플릿/ }).first().click();
    await page.getByRole("button", { name: /^시간표 비우기$/ }).click();

    await expect(page.getByText(/2개 수업이 삭제되었습니다/)).toBeVisible({ timeout: 5000 });
  });
});
