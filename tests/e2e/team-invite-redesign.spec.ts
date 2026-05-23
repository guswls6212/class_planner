/**
 * 팀 멤버 초대 UX 재설계 e2e — design-exploration team-invite-redesign Variant C +
 * Option 1 회귀 가드 (PR #444 + #445 후속).
 *
 * 검증 시나리오:
 * 1. 관리자 초대 모달 — 별칭 필수 input 표시 + 비우면 submit disabled
 * 2. settings 페이지의 admin pending invite row 렌더 (원장과 강사 사이)
 * 3. invite_pending row 의 ⋯ 메뉴 — "링크 복사" 제거됨, "새 링크 발급" + "초대 취소" 만
 * 4. admin 발급 토스트 — "${label}(관리자) 초대 링크가 복사됐습니다"
 * 5. "새 링크 발급" — POST /api/invites/[id]/regenerate atomic endpoint 호출
 *
 * 헬퍼: gotoAuthenticated + injectRealSession (teachers-crud.spec.ts 패턴).
 * GET endpoints 는 page.route mock — 격리 + 빠른 응답. POST 만 mock 또는 진짜 API.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { gotoAuthenticated, injectRealSession } from "./helpers/auth-mock";

interface InvitePostBody {
  role?: string;
  teacherId?: string | null;
  label?: string;
}

async function setupAuthedSettings(
  page: Page,
  opts: { invites?: unknown[]; teachers?: unknown[] } = {},
): Promise<void> {
  await injectRealSession(page);

  const okJson = (route: Route, data: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });

  await page.route("**/api/teachers**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, opts.teachers ?? []);
    return route.continue();
  });
  await page.route("**/api/students**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
  await page.route("**/api/subjects**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
  await page.route("**/api/sessions**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
  await page.route("**/api/enrollments**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
  await page.route(/\/api\/invites(\?|$)/, async (route) => {
    if (route.request().method() === "GET") return okJson(route, opts.invites ?? []);
    return route.continue();
  });
  await page.route("**/api/share-tokens**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
  await page.route("**/api/academy/members**", async (route) => {
    if (route.request().method() === "GET") return okJson(route, []);
    return route.continue();
  });
}

test.describe("팀 초대 UX 재설계", () => {
  test("관리자 초대 모달에 별칭 input 필수 + 비우면 submit disabled", async ({ page }) => {
    await setupAuthedSettings(page);
    await gotoAuthenticated(page, "/settings");

    await page.getByTestId("invite-member-cta").click();
    await expect(page.getByRole("heading", { name: "멤버 초대" })).toBeVisible();

    // 관리자 카드 선택
    await page.getByTestId("invite-role-card-admin").click();

    // 별칭 input 표시 확인
    const labelInput = page.getByTestId("invite-admin-label-input");
    await expect(labelInput).toBeVisible();
    await expect(labelInput).toHaveAttribute("placeholder", /박원장님|예:/);

    // submit 버튼 — 별칭 비우면 disabled
    const submit = page.getByRole("button", { name: /링크 생성/ });
    await expect(submit).toBeDisabled();

    // 별칭 입력 후 enabled
    const alias = `e2e_관리자_${Date.now()}`;
    await labelInput.fill(alias);
    await expect(submit).toBeEnabled();

    // 공백만 입력 → disabled
    await labelInput.fill("   ");
    await expect(submit).toBeDisabled();
  });

  test("관리자 초대 발급 시 body 에 label 포함 + 토스트 '(관리자)' 표시", async ({ page }) => {
    await setupAuthedSettings(page);

    let invitePostBody: InvitePostBody | null = null;
    await page.route(/\/api\/invites(\?|$)/, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        invitePostBody = JSON.parse(route.request().postData() || "{}") as InvitePostBody;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "new-inv",
              token: "new-token-hex",
              role: "admin",
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              invitee_label: invitePostBody.label ?? null,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await gotoAuthenticated(page, "/settings");
    await page.getByTestId("invite-member-cta").click();
    await page.getByTestId("invite-role-card-admin").click();

    const alias = `박관리자_${Date.now()}`;
    await page.getByTestId("invite-admin-label-input").fill(alias);
    await page.getByRole("button", { name: /링크 생성/ }).click();

    await expect.poll(() => invitePostBody, { timeout: 5000 }).not.toBeNull();
    expect(invitePostBody!.role).toBe("admin");
    expect(invitePostBody!.label).toBe(alias);

    // 토스트 — "(관리자)" 라벨 포함 검증
    const toast = page.getByText(new RegExp(`${alias}\\(관리자\\)`));
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test("settings 페이지에 admin pending invite row 가 별칭과 함께 표시된다", async ({ page }) => {
    const alias = `박관리자_${Date.now()}`;
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await setupAuthedSettings(page, {
      invites: [
        {
          id: "inv-admin-1",
          token: "tok-admin",
          role: "admin",
          expiresAt: futureExpiry,
          teacherId: null,
          teacherName: null,
          label: alias,
        },
      ],
    });

    await gotoAuthenticated(page, "/settings");

    const row = page.getByTestId("admin-invite-row-inv-admin-1");
    await expect(row).toBeVisible();
    await expect(row.getByText(alias)).toBeVisible();
    await expect(row.getByText(/초대 대기/)).toBeVisible();
  });

  test("admin invite row 의 ⋯ 메뉴 — '새 링크 발급' + '초대 취소' 2 항목, '링크 복사' 메뉴에서 제외", async ({ page }) => {
    const alias = `박관리자_${Date.now()}`;
    await setupAuthedSettings(page, {
      invites: [
        {
          id: "inv-admin-2",
          token: "tok-admin-2",
          role: "admin",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          teacherId: null,
          teacherName: null,
          label: alias,
        },
      ],
    });

    await gotoAuthenticated(page, "/settings");

    // ⋯ 메뉴 트리거
    await page.getByTestId("admin-invite-menu-trigger-inv-admin-2").click();

    // 메뉴 영역 한정 검증 — data-testid 로 menu container 직접 지정.
    const menu = page.getByTestId("admin-invite-menu-inv-admin-2");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "새 링크 발급" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "초대 취소" })).toBeVisible();
    // "링크 복사" 는 quick action 으로 분리되어 메뉴에 없음 (Option 1).
    await expect(menu.getByText("링크 복사")).toHaveCount(0);
  });

  test("admin invite '새 링크 발급' → POST /api/invites/[id]/regenerate 호출", async ({ page }) => {
    const alias = `박관리자_${Date.now()}`;
    let regenerateCalled = false;

    await setupAuthedSettings(page, {
      invites: [
        {
          id: "inv-admin-3",
          token: "tok-admin-3",
          role: "admin",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          teacherId: null,
          teacherName: null,
          label: alias,
        },
      ],
    });

    await page.route("**/api/invites/inv-admin-3/regenerate**", async (route) => {
      regenerateCalled = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "inv-admin-3",
            token: "tok-admin-3-rotated",
            role: "admin",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            invitee_label: alias,
          },
        }),
      });
    });

    await gotoAuthenticated(page, "/settings");
    await page.getByTestId("admin-invite-menu-trigger-inv-admin-3").click();
    await page.getByRole("button", { name: "새 링크 발급" }).click();

    await expect.poll(() => regenerateCalled, { timeout: 5000 }).toBe(true);
  });
});
