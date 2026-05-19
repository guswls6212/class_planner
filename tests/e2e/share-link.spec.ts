/**
 * Share link e2e — settings 페이지의 "고급 공유 옵션" 아코디언 + share-tokens API.
 *
 * PR F — PR D 머지 후 academy owner 권한 가능. injectRealSession 사용.
 *
 * UI 구조 (settings/page.tsx:658-880):
 * - 아코디언 헤더 role="button" "고급 공유 옵션"
 * - 열기 → "링크 만들기" 버튼 (Plus icon)
 * - 모달 form: shareLabel(text), shareStudentId(select), shareExpiresInDays(select)
 * - "생성" 버튼 → POST /api/share-tokens?userId=... → 토큰 자동 클립보드 복사
 *
 * 회귀 가드:
 * - canManage=owner 권한으로 settings 진입
 * - 공유 링크 섹션 visible
 * - 모달 → 생성 → POST 호출 검증
 */
import { expect, test, type Route } from "@playwright/test";
import { gotoAuthenticated, injectRealSession } from "./helpers/auth-mock";

interface ShareTokenPostBody {
  label?: string;
  filterStudentId?: string | null;
  expiresInDays?: number;
}

test.describe("share link — 고급 공유 옵션 아코디언 + token 발급", () => {
  test.beforeEach(async ({ page }) => {
    await injectRealSession(page);
  });

  test("settings 페이지에 '고급 공유 옵션' 섹션이 표시된다 (academy owner)", async ({
    page,
  }) => {
    await gotoAuthenticated(page, "/settings");

    // 아코디언 헤더 — role=button + text "고급 공유 옵션"
    await expect(page.getByRole("button", { name: /고급 공유 옵션/ })).toBeVisible({
      timeout: 10000,
    });
  });

  test("아코디언 열기 → '링크 만들기' 버튼 표시", async ({ page }) => {
    await gotoAuthenticated(page, "/settings");

    const accordionHeader = page.getByRole("button", { name: /고급 공유 옵션/ });
    await expect(accordionHeader).toBeVisible({ timeout: 10000 });
    await accordionHeader.click();

    // 빈 상태에서는 본문에도 안내용 "링크 만들기" 버튼 추가 노출 — 헤더 button을 .first()로 특정
    await expect(page.getByRole("button", { name: /링크 만들기/ }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("'링크 만들기' → 모달 열기 → '생성' 클릭 시 POST /api/share-tokens 호출", async ({
    page,
    context,
  }) => {
    // PR O — settings/page.tsx에 data-testid 3개 추가:
    // share-create-trigger (헤더 button), share-create-modal (모달 컨테이너),
    // share-create-modal-submit ("생성" 버튼). 정확한 selector로 stale fragility 제거.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    let postBody: ShareTokenPostBody | null = null;
    let postCalled = false;
    await page.route("**/api/share-tokens**", async (route: Route) => {
      const method = route.request().method();
      if (method === "POST") {
        postCalled = true;
        postBody = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "share-tok-fixture",
              token: "fixture-token-32bytes-hex-string",
              label: postBody?.label ?? null,
              filter_student_id: postBody?.filterStudentId ?? null,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
            },
          }),
        });
      } else if (method === "GET") {
        // 기존 tokens 빈 배열 — 깨끗한 상태
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await gotoAuthenticated(page, "/settings");

    const accordionHeader = page.getByRole("button", { name: /고급 공유 옵션/ });
    await expect(accordionHeader).toBeVisible({ timeout: 10000 });
    await accordionHeader.click();

    // 헤더 trigger button (data-testid로 본문 button과 정확히 구분)
    await page.getByTestId("share-create-trigger").click();

    // 모달 mount 대기 — data-testid="share-create-modal"
    await expect(page.getByTestId("share-create-modal")).toBeVisible({ timeout: 5000 });

    // "생성" 버튼 — data-testid="share-create-modal-submit"
    await page.getByTestId("share-create-modal-submit").click();

    // POST /api/share-tokens 호출됨
    await expect.poll(() => postCalled, { timeout: 5000 }).toBeTruthy();
    expect(postBody).not.toBeNull();
    // expiresInDays default는 30
    expect(postBody!.expiresInDays).toBeDefined();
  });

  test.skip("발급된 share token의 /share/[token] public route 접근", async ({
    browser,
  }) => {
    // FIXME: 진짜 token으로 newPage에서 /share/[token] 접근 — 진짜 GET /api/share/[token]
    // 응답 검증 필요. cleanup도 포함. 별도 후속 PR로 분리.
    const context = await browser.newContext();
    const newPage = await context.newPage();
    await newPage.goto("/share/fixture-token-32bytes-hex-string");
    await expect(newPage.getByText(/시간표/)).toBeVisible({ timeout: 10000 });
    await context.close();
  });
});
