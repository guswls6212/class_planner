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
import {
  seedSecondAcademy,
  clearSecondAcademies,
} from "./helpers/seed-academy-data";

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

  // RC 추적 완료 (2026-05-18, issue #398): auth-mock.ts pre-seed 가 academies=[] 로
  // 박혀 Sidebar activeAcademy=undefined → aria-label="학원" → locator fail. Fix:
  // auth-mock 의 sessionStorage pre-seed 에 academyId 사전 시드. spec 은 try/finally +
  // waitForResponse 로 cleanup race + MemberContext fetch 대기 보장. skip 해제.
  test("두 번째 academy 생성 → switcher 메뉴에 두 academy 모두 표시", async ({ page }) => {
    await clearSecondAcademies();
    try {
      const secondAcademy = await seedSecondAcademy({ name: "E2E Test Academy 2" });

      await page.goto("/schedule");
      // MemberContext 의 /api/academies/mine fetch 가 두 번째 academy 를 받아오기 전엔
      // sessionStorage pre-seed (첫 academy 만) 가 source-of-truth. 명시적 대기.
      await page.waitForResponse(/\/api\/academies\/mine/);

      const switcherButton = page
        .getByRole("button", { name: /E2E Test Academy(?! 2)/ })
        .first();
      await expect(switcherButton).toBeVisible({ timeout: 10000 });
      await switcherButton.click();

      // 메뉴에 두 academy 모두 visible
      await expect(page.getByText("E2E Test Academy", { exact: true })).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(secondAcademy.name, { exact: true })).toBeVisible({
        timeout: 5000,
      });
    } finally {
      // assertion fail 시에도 cleanup 보장 (이전 회귀: 후속 spec 가 두 academy_members
      // 잔존으로 cascade fail). try/finally 로 격리.
      await clearSecondAcademies();
    }
  });

  test.skip("multi-academy switch → reload → data scope 변경", async () => {
    // FIXME: switch 클릭 → POST /api/auth/set-active-academy → reload → schedule 데이터 변경
    // 검증은 reload 후 page state 재진입 + 데이터 일관성 검증 — page.context() 새로 필요.
    // 후속 PR에서 reload pattern 정립 후 unskip.
  });
});
