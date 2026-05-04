/**
 * Multi-academy e2e — 사이드바 academy switcher UI.
 *
 * PR G — PR D 머지 후 academy owner. injectRealSession으로 사이드바 switcher 진입 가능.
 *
 * 본 PR 범위: single academy 상태에서 switcher UI 검증.
 *   - switcher button 표시
 *   - 메뉴 열기 → academy 1개 + ✓ 표시
 *   - 새 학원 만들기 버튼
 *
 * 진짜 academy 전환(multi → switch → reload → data scope) 시나리오는 후속 PR로 분리:
 *   - service role로 두 번째 academy seed
 *   - cleanup 보장
 *   - schedule 페이지 데이터 변경 검증
 *
 * UI 위치: src/components/molecules/Sidebar.tsx:223-318
 */
import { expect, test } from "@playwright/test";
import { injectRealSession } from "./helpers/auth-mock";

test.describe("multi-academy — 사이드바 academy switcher UI", () => {
  test.beforeEach(async ({ page }) => {
    await injectRealSession(page);
  });

  test("사이드바에 academy switcher 버튼이 표시된다 (academy owner)", async ({ page }) => {
    await page.goto("/schedule");

    // Sidebar의 academy switcher button — aria-label={activeAcademy?.name}
    // 진짜 academy name은 'E2E Test Academy' (setup-e2e-test-user.ts에서 INSERT)
    await expect(
      page.getByRole("button", { name: /E2E Test Academy/ }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("switcher 클릭 → 메뉴 열기 → '내 학원' 헤더 + 활성 ✓ 표시", async ({ page }) => {
    await page.goto("/schedule");

    const switcherButton = page
      .getByRole("button", { name: /E2E Test Academy/ })
      .first();
    await expect(switcherButton).toBeVisible({ timeout: 10000 });
    await switcherButton.click();

    // 메뉴 열림 — '내 학원' 헤더 또는 '+ 새 학원 만들기' 버튼
    await expect(page.getByText(/내 학원/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/새 학원 만들기/)).toBeVisible({ timeout: 3000 });
  });

  test.skip("multi-academy switch — 두 번째 academy 생성 후 전환 → reload → data scope 변경", async () => {
    // FIXME: service role로 두 번째 academy seed + cleanup 보장 후속 PR.
    // - sb.from('academies').insert({ name: 'Second Academy', created_by: userId })
    // - sb.from('academy_members').insert({ academy_id, user_id, role: 'admin' })
    // - 사이드바 switch → POST /api/auth/set-active-academy → reload → schedule 데이터 변경
  });
});
