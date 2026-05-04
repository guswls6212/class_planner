/**
 * Teachers CRUD e2e — TeacherAddModal 3-action flow 회귀 가드.
 *
 * settings 페이지의 "강사 추가" 버튼 → TeacherAddModal:
 *   - 이름 빈 채로 제출 → showError
 *   - 이메일 없을 때: "추가 + 공유 링크 발급" / "일단 추가만" 2버튼
 *   - 이메일 있을 때: "추가 + 초대 링크 생성" / "추가 + 시간표 공유 링크만" / "일단 추가만" 3버튼
 *   - TEACHER_NAME_DUPLICATE 응답 시 "이미 같은 이름..." 토스트
 *
 * API 엔드포인트:
 *   - POST /api/teachers?userId=...
 *   - POST /api/invites?userId=...   (action=invite)
 *   - POST /api/share-tokens?userId=...  (action=share)
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { injectSupabaseSession, mockSupabaseAuthApi, E2E_TEST_USER } from "./helpers/auth-mock";

interface TeacherPostBody {
  name?: string;
  color?: string;
  email?: string | null;
  phone?: string | null;
}

interface InvitePostBody {
  role?: string;
  teacherId?: string;
}

interface SharePostBody {
  teacherId?: string;
  label?: string;
  expiresInDays?: number;
}

async function setupAuthedSettings(page: Page): Promise<void> {
  await injectSupabaseSession(page);
  await mockSupabaseAuthApi(page);

  // settings 페이지가 호출하는 GET endpoints는 빈 응답으로 — UI가 깨지지 않도록
  const emptyOk = (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  await page.route("**/api/teachers**", async (route) => {
    if (route.request().method() === "GET") return emptyOk(route);
    return route.continue();
  });
  await page.route("**/api/students**", async (route) => {
    if (route.request().method() === "GET") return emptyOk(route);
    return route.continue();
  });
  await page.route("**/api/subjects**", async (route) => {
    if (route.request().method() === "GET") return emptyOk(route);
    return route.continue();
  });
  await page.route("**/api/sessions**", async (route) => {
    if (route.request().method() === "GET") return emptyOk(route);
    return route.continue();
  });
  await page.route("**/api/enrollments**", async (route) => {
    if (route.request().method() === "GET") return emptyOk(route);
    return route.continue();
  });
}

async function openTeacherAddModal(page: Page): Promise<void> {
  await page.goto("/settings");
  await page.getByRole("button", { name: /^강사 추가$/ }).first().click();
  await expect(page.getByRole("heading", { name: "강사 추가" })).toBeVisible();
}

test.describe("teachers CRUD — TeacherAddModal", () => {
  test("강사 추가 버튼 클릭 시 모달이 열린다", async ({ page }) => {
    await setupAuthedSettings(page);
    await openTeacherAddModal(page);

    await expect(page.getByPlaceholder("예: 김강사")).toBeVisible();
    await expect(page.getByPlaceholder("park@example.com")).toBeVisible();
  });

  test("이름 빈 채로 '일단 추가만' 클릭 시 에러 토스트가 표시된다", async ({ page }) => {
    await setupAuthedSettings(page);
    await openTeacherAddModal(page);

    await page.getByRole("button", { name: /일단 추가만/ }).first().click();

    await expect(page.getByText(/강사 이름을 입력해주세요/)).toBeVisible({ timeout: 3000 });
  });

  test("이름만 입력 + '일단 추가만' → POST /api/teachers 호출 (이메일 null)", async ({ page }) => {
    await setupAuthedSettings(page);

    let teacherBody: TeacherPostBody | null = null;
    await page.route("**/api/teachers**", async (route) => {
      if (route.request().method() === "POST") {
        teacherBody = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "t-new", name: teacherBody?.name, color: teacherBody?.color },
          }),
        });
      } else if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await openTeacherAddModal(page);
    await page.getByPlaceholder("예: 김강사").fill("E2E 강사");
    await page.getByRole("button", { name: /일단 추가만/ }).first().click();

    await expect.poll(() => teacherBody, { timeout: 5000 }).not.toBeNull();
    expect(teacherBody!.name).toBe("E2E 강사");
    expect(teacherBody!.email).toBeNull();
    expect(teacherBody!.phone).toBeNull();
    expect(typeof teacherBody!.color).toBe("string");
  });

  test("이메일 + 이름 입력 시 '추가 + 초대 링크 생성' 버튼이 표시된다", async ({ page }) => {
    await setupAuthedSettings(page);
    await openTeacherAddModal(page);

    await page.getByPlaceholder("예: 김강사").fill("초대 강사");
    await page.getByPlaceholder("park@example.com").fill("invite@example.com");

    await expect(page.getByRole("button", { name: /추가 \+ 초대 링크 생성/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /추가 \+ 시간표 공유 링크만/ })).toBeVisible();
  });

  test("'추가 + 초대 링크 생성' → POST /api/teachers + POST /api/invites 호출 (token 자동 복사)", async ({
    page,
    context,
  }) => {
    await setupAuthedSettings(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    let teacherBody: TeacherPostBody | null = null;
    let inviteBody: InvitePostBody | null = null;
    await page.route("**/api/teachers**", async (route) => {
      if (route.request().method() === "POST") {
        teacherBody = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "t-invite", name: teacherBody?.name, color: teacherBody?.color },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });
    await page.route("**/api/invites**", async (route) => {
      if (route.request().method() === "POST") {
        inviteBody = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { token: "invite-tok-123" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await openTeacherAddModal(page);
    await page.getByPlaceholder("예: 김강사").fill("초대 강사");
    await page.getByPlaceholder("park@example.com").fill("invite@example.com");
    await page.getByRole("button", { name: /추가 \+ 초대 링크 생성/ }).click();

    await expect.poll(() => teacherBody, { timeout: 5000 }).not.toBeNull();
    await expect.poll(() => inviteBody, { timeout: 5000 }).not.toBeNull();
    expect(teacherBody!.email).toBe("invite@example.com");
    expect(inviteBody!.role).toBe("member");
    expect(inviteBody!.teacherId).toBe("t-invite");

    await expect(page.getByText(/초대 링크가 복사되었습니다/)).toBeVisible({ timeout: 5000 });
  });

  test("TEACHER_NAME_DUPLICATE 응답 시 '이미 같은 이름' 토스트 표시", async ({ page }) => {
    await setupAuthedSettings(page);

    await page.route("**/api/teachers**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "TEACHER_NAME_DUPLICATE", message: "duplicate" },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });

    await openTeacherAddModal(page);
    await page.getByPlaceholder("예: 김강사").fill("중복 강사");
    await page.getByRole("button", { name: /일단 추가만/ }).first().click();

    await expect(page.getByText(/이미 같은 이름의 강사가 있습니다/)).toBeVisible({ timeout: 5000 });
    // 모달은 닫히지 않아야 한다 — 사용자가 이름 수정 가능
    await expect(page.getByPlaceholder("예: 김강사")).toBeVisible();
  });
});

// 사용 안 하지만 test 파일이 헬퍼만 import 안 하도록 살림
void E2E_TEST_USER;
