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
import { gotoAuthenticated, injectRealSession } from "./helpers/auth-mock";

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
  // PR C — 진짜 Supabase 토큰으로 AuthGuard 통과. global-setup.ts 사전 실행 필요.
  await injectRealSession(page);

  // settings 페이지의 GET endpoints는 mock으로 — 빠른 응답 + test 격리.
  // POST 시나리오만 mock 또는 진짜 API (test별 결정).
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
  // gotoAuthenticated — AuthGuard race 회피 (page.route GET fulfill 등록 후 page.goto 시
  // ~10-20% 빈도로 /login redirect 발생하던 fail 가드. flaky audit 2026-05-19).
  await gotoAuthenticated(page, "/settings");
  // settings 팀 섹션 CTA 는 PR #417 부터 "멤버 초대" 라벨 (data-testid="invite-member-cta").
  // 모달 자체 heading 은 TeacherAddModal 내부의 "강사 추가" 유지 — 모달 컴포넌트는 본 PR 손대지 않음.
  await page.getByTestId("invite-member-cta").click();
  await expect(page.getByRole("heading", { name: "강사 추가" })).toBeVisible();
}

// PR C — Supabase password auth로 진짜 토큰 발급, AuthGuard 통과.
// global-setup.ts가 e2e 시작 시 한 번 로그인하고 session.json 저장.
// 본 spec은 injectRealSession으로 모든 page에 진짜 session 주입.
// PR #419: '+ 멤버 초대' CTA 가 TeacherAddModal → InviteModal 로 전환되어
// TeacherAddModal 의 settings 진입점이 사라짐. 본 spec 의 모든 test 는
// openTeacherAddModal helper 가 의존하던 진입점에 도달 불가.
//
// 강사 페이지(/teachers) 에 별도 진입점 신설 시 spec 부활 — describe.skip 해제
// 후 helper 만 갱신 (모달 자체 동작 검증 로직은 그대로 유효).
//
// 회귀 가드는 unit (TeacherAddModal.test.tsx) 가 책임 — modal 자체 동작은 유지.
test.describe.skip("teachers CRUD — TeacherAddModal (PR #419 — orphan, /teachers 진입점 신설 후 부활)", () => {
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
