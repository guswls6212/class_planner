/**
 * Templates multi-slot e2e — T2 SlotPickerModal save/apply 회귀 가드 (ADR-008).
 *
 * 회귀 가드 핵심:
 * - SlotPickerModal save: 빈 academy → 슬롯 1 default → POST 발사 (default name "슬롯 1")
 * - 슬롯 1 채워진 academy → 슬롯 2 default + 사용자 입력 이름 → POST
 * - 빈 client + 서버 quota 403 → "추후 업데이트 예정" 토스트
 * - 기존 슬롯 클릭 → PUT (갱신, POST 안 감)
 * - apply mode: 빈 슬롯 disabled, 채워진 슬롯만 활성
 * - "추후 업데이트 예정" 슬롯 3-5 disabled UI
 *
 * mock 기반 (route intercept) — schedule-templates.spec.ts 패턴 재사용.
 * 실시간 DB 의존 X, RLS 무관 (PR-D unit + SlotPickerModal.test.tsx 가 컴포넌트 단위 검증
 * — 본 스펙은 page.tsx 통합 + handleSaveSlot/handleApplySlot 분기 회귀만 가드).
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { currentWeekMondayKST } from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const WEEK = currentWeekMondayKST();
const NOW = new Date().toISOString();

interface TemplateApiPayload {
  id: string;
  name: string;
  description: string | null;
  template_data: { version: string; sessions: unknown[] };
  slot_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const TPL_SLOT_0: TemplateApiPayload = {
  id: "tpl-slot-0",
  name: "학기중",
  description: null,
  template_data: { version: "1.0", sessions: [] },
  slot_index: 0,
  created_by: TEST_USER_ID,
  created_at: NOW,
  updated_at: NOW,
};

async function seedScheduleData(page: Page): Promise<void> {
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

interface PostBody {
  name?: string;
  description?: string | null;
  templateData?: unknown;
}

interface PutBody {
  name?: string;
  description?: string;
  template_data?: unknown;
}

interface MockState {
  templates: TemplateApiPayload[];
  postBody: PostBody | null;
  postStatus: 201 | 403;
  putCalls: Array<{ id: string; body: PutBody }>;
}

function createMockState(initial: Partial<Pick<MockState, "templates" | "postStatus">> = {}): MockState {
  return {
    templates: initial.templates ?? [],
    postBody: null,
    postStatus: initial.postStatus ?? 201,
    putCalls: [],
  };
}

async function mockTemplatesApi(page: Page, state: MockState): Promise<void> {
  await page.route("**/api/templates**", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    const idMatch = url.match(/\/api\/templates\/([^?]+)/);

    if (method === "GET" && !idMatch) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: state.templates }),
      });
      return;
    }

    if (method === "POST" && !idMatch) {
      state.postBody = JSON.parse(route.request().postData() || "{}") as PostBody;
      if (state.postStatus === 201) {
        const slot = state.templates.some((t) => t.slot_index === 0) ? 1 : 0;
        const newTpl: TemplateApiPayload = {
          id: `tpl-new-${Date.now()}`,
          name: state.postBody.name ?? "",
          description: state.postBody.description ?? null,
          template_data:
            (state.postBody.templateData as { version: string; sessions: unknown[] }) ?? {
              version: "1.0",
              sessions: [],
            },
          slot_index: slot,
          created_by: TEST_USER_ID,
          created_at: NOW,
          updated_at: NOW,
        };
        state.templates = [...state.templates, newTpl];
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: newTpl }),
        });
      } else {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "TEMPLATES_QUOTA_EXCEEDED",
            message:
              "프리 티어는 academy 당 최대 2개 템플릿까지 사용할 수 있습니다. (추후 업데이트 예정)",
          }),
        });
      }
      return;
    }

    if (method === "PUT" && idMatch) {
      const id = idMatch[1];
      const body = JSON.parse(route.request().postData() || "{}") as PutBody;
      state.putCalls.push({ id, body });
      const existing = state.templates.find((t) => t.id === id);
      if (existing) {
        const updated = { ...existing, name: body.name ?? existing.name };
        state.templates = state.templates.map((t) => (t.id === id ? updated : t));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: updated }),
        });
      } else {
        await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
      }
      return;
    }

    await route.continue();
  });
}

async function openSavePicker(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^템플릿/ }).first().click();
  await page.getByRole("button", { name: /현재 주를 템플릿으로 저장/ }).click();
  await expect(page.getByText("어느 슬롯에 저장할까요?")).toBeVisible();
}

async function openApplyPicker(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^템플릿/ }).first().click();
  await page.getByRole("button", { name: /^템플릿 적용하기/ }).click();
  await expect(page.getByText("어느 슬롯을 적용할까요?")).toBeVisible();
}

test.describe("templates multi-slot — SlotPickerModal save/apply + quota", () => {
  test("save: 빈 academy → 저장 → POST 발사 (default name 슬롯 1) + Coming soon 슬롯 3개 표시", async ({
    page,
  }) => {
    await seedScheduleData(page);
    const state = createMockState();
    await mockTemplatesApi(page, state);

    await page.goto("/schedule");
    await openSavePicker(page);

    // Coming soon 슬롯 3-5 라벨 (회귀 가드 — multi-slot UI 핵심 시각)
    await expect(page.getByText("추후 업데이트 예정")).toHaveCount(3);

    // Coming soon 슬롯 disabled
    for (const idx of [3, 4, 5]) {
      await expect(page.getByLabel(`슬롯 ${idx} 추후 업데이트 예정`)).toBeDisabled();
    }

    await page.getByRole("button", { name: /^저장$/ }).click();
    await expect.poll(() => state.postBody, { timeout: 5000 }).not.toBeNull();
    expect(state.postBody!.name).toBe("슬롯 1");
  });

  test("save: 슬롯 1 채워진 academy → 슬롯 2 default + 사용자 이름 입력 → POST body.name 반영", async ({
    page,
  }) => {
    await seedScheduleData(page);
    const state = createMockState({ templates: [TPL_SLOT_0] });
    await mockTemplatesApi(page, state);

    await page.goto("/schedule");
    await page.waitForResponse((res) => res.url().includes("/api/templates") && res.ok());
    await openSavePicker(page);

    // 슬롯 1 의 name 표시 + 슬롯 2 (비어있음)
    await expect(page.getByText("학기중")).toBeVisible();
    await expect(page.getByText("(비어있음)")).toBeVisible();

    // default = first-empty (슬롯 2). 사용자 이름 입력.
    await page.getByLabel("슬롯 이름 (선택)").fill("방학");
    await page.getByRole("button", { name: /^저장$/ }).click();

    await expect.poll(() => state.postBody, { timeout: 5000 }).not.toBeNull();
    expect(state.postBody!.name).toBe("방학");
    expect(state.putCalls).toHaveLength(0);
  });

  test("save: 빈 client + 서버 quota 403 → 추후 업데이트 예정 토스트 + 모달 유지", async ({
    page,
  }) => {
    await seedScheduleData(page);
    const state = createMockState({ postStatus: 403 });
    await mockTemplatesApi(page, state);

    await page.goto("/schedule");
    await openSavePicker(page);

    await page.getByRole("button", { name: /^저장$/ }).click();

    await expect(page.getByText(/추후 업데이트 예정/)).toBeVisible({ timeout: 5000 });
    // 모달 유지 (handleSaveSlot 의 quota 분기는 setShowSavePickerModal(false) 안 함)
    await expect(page.getByText("어느 슬롯에 저장할까요?")).toBeVisible();
  });

  test("save: 기존 슬롯 1 클릭 → PUT (갱신), POST 발사 X", async ({ page }) => {
    await seedScheduleData(page);
    const state = createMockState({ templates: [TPL_SLOT_0] });
    await mockTemplatesApi(page, state);

    await page.goto("/schedule");
    await page.waitForResponse((res) => res.url().includes("/api/templates") && res.ok());
    await openSavePicker(page);

    // default = slot 2 (first-empty). 사용자가 slot 1 클릭 → existing → PUT.
    await page.getByText("학기중").click();
    await page.getByRole("button", { name: /^저장$/ }).click();

    await expect.poll(() => state.putCalls.length, { timeout: 5000 }).toBeGreaterThan(0);
    expect(state.putCalls[0].id).toBe(TPL_SLOT_0.id);
    expect(state.postBody).toBeNull();
  });

  test("apply: 채워진 슬롯만 활성, 빈 슬롯 + Coming soon 슬롯 disabled", async ({ page }) => {
    await seedScheduleData(page);
    const state = createMockState({ templates: [TPL_SLOT_0] });
    await mockTemplatesApi(page, state);

    await page.goto("/schedule");
    await page.waitForResponse((res) => res.url().includes("/api/templates") && res.ok());
    await openApplyPicker(page);

    const slot1Button = page.getByText("학기중").locator("xpath=ancestor::button");
    const slot2Button = page.getByText("(비어있음)").locator("xpath=ancestor::button");

    await expect(slot1Button).toBeEnabled();
    await expect(slot2Button).toBeDisabled();

    // Coming soon 슬롯 (3-5) 도 disabled
    for (const idx of [3, 4, 5]) {
      await expect(page.getByLabel(`슬롯 ${idx} 추후 업데이트 예정`)).toBeDisabled();
    }
  });
});
