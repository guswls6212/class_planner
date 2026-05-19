/**
 * 모달 fade-in transition flaky 가드 — 0.2s modalFadeIn keyframe (opacity 0→1 + scale 0.95→1.0)
 *
 * 검증 의도:
 * - opacity transition 진행 중에 dialog 내부 click 이 race 없이 처리되는지
 * - Playwright auto-wait + actionability 가 transition 완료까지 잘 대기하는지
 * - 향후 CSS animation 변경 (duration, ease, keyframe) 시 회귀 가드
 *
 * 회귀 패턴 (이론적, 현재 history 없음):
 * - duration 증가 (0.2s → 0.5s) 후 짧은 timeout 의 click 시도 시 fail
 * - opacity 0 상태에서 click 처리되어 사용자 의도 어긋남
 *
 * SSOT: src/app/globals.css 의 @keyframes modalFadeIn (line ~modalFadeIn)
 * 관련 helper: ./scroll-position-preservation.spec.ts 의 waitOneFrame (RAF 1 사이클)
 */
import { expect, test, type Page } from "@playwright/test";
import {
  currentWeekMondayKST,
  makeDefaultSeed,
  seedAnonymous,
  type SeedSession,
} from "./helpers/seed-anonymous";

const WEEK = currentWeekMondayKST();

const SAMPLE_SESSION: SeedSession = {
  id: "sess-modal-test",
  subjectId: "sub-1",
  weekday: 0,
  startsAt: "10:00",
  endsAt: "11:00",
  weekStartDate: WEEK,
  enrollmentIds: ["enr-1"],
  yPosition: 1,
};

/** dialog element 의 opacity 가 "1" 도달까지 wait — modalFadeIn keyframe 완료 검증 */
async function waitDialogOpacityFull(
  page: Page,
  dialogSelector: string,
): Promise<void> {
  await expect
    .poll(
      async () =>
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return "0";
          return getComputedStyle(el).opacity;
        }, dialogSelector),
      { timeout: 2000 },
    )
    .toBe("1");
}

test.describe("modal fade-in transition flaky 가드", () => {
  test.beforeEach(async ({ page }) => {
    await seedAnonymous(page, makeDefaultSeed([SAMPLE_SESSION]));
    await page.goto("/schedule");
    await page.waitForSelector('[data-testid="time-table-grid"]', { timeout: 15000 });
  });

  test("수업 추가 모달 — 열기/닫기 transition 완료 검증", async ({ page }) => {
    // 우상단 "+" 수업 추가 버튼 (또는 메인 영역의 수업 추가 CTA)
    const addBtn = page.getByRole("button", { name: /수업 추가/ }).first();
    await addBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });

    // modalFadeIn 0.2s ease-out 완료까지 opacity 1 도달 wait
    await waitDialogOpacityFull(page, '[role="dialog"]');

    // transition 완료 후 dialog 내부 element 가 즉시 클릭 가능한지 검증
    // (closeBtn 의 aria-label="닫기")
    const closeBtn = dialog.getByRole("button", { name: "닫기" }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // 닫기 후 dialog 사라짐 검증 (transition 완료 후 unmount)
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });

  test("수업 편집 모달 — session 클릭 → dialog visible + transition 완료", async ({
    page,
  }) => {
    // seed 된 sess-modal-test 클릭
    const sessionBlock = page.locator(
      '[data-testid="session-block-sess-modal-test"]',
    );
    await expect(sessionBlock).toBeVisible({ timeout: 5000 });
    await sessionBlock.click();

    // 편집 모달 — 별도 testid 'edit-session-modal' 사용 (page.tsx EditSessionModal)
    const editDialog = page.locator('[data-testid="edit-session-modal"]');
    await expect(editDialog).toBeVisible({ timeout: 2000 });

    // modalFadeIn transition 완료까지 wait
    await waitDialogOpacityFull(page, '[data-testid="edit-session-modal"]');

    // dialog 내부 element 액션 가능 (취소 버튼)
    const cancelBtn = editDialog.getByRole("button", { name: /취소/ }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await expect(editDialog).not.toBeVisible({ timeout: 2000 });
  });
});
