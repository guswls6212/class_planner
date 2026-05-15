/**
 * 다중 선택 + 드래그 + 일괄 작업 e2e — anonymous mode (인증 불필요).
 *
 * Coverage (PR #200~#203 회귀 가드):
 * - T1~T6: 다중 선택 state + UI 동기화 (Shift/Ctrl+click, Esc, SelectionBar count)
 * - T7~T8: 일괄 삭제 + undo
 * - T9: 3개 선택 + drag → 3개 모두 이동 (사용자 보고된 회귀 — bulk drag state race)
 * - T10~T11: Cmd-drag 복사 (single + multi)
 * - T12~T13: DragOverlayCard 시각 (data-copy, data-multi-count)
 * - T17: 모바일 long-press 메뉴
 *
 * 인증 불필요 시나리오는 anonymous classPlannerData seed로 빠르게 setup.
 * 인증 + sync 검증은 schedule-sync-network.spec.ts 참조.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  modifierDrag,
  modifierDragReleasedMidway,
  plainDrag,
  startDragAndHover,
  finishDrag,
} from "./helpers/dnd-helpers";
import {
  shiftClickBoth,
  shiftClickAll,
  sessionBlock,
  sessionDragHandle,
  dropCell,
} from "./helpers/multi-select-helpers";
import {
  currentWeekMondayKST,
  makeDefaultSeed,
  seedAnonymous,
  type SeedSession,
} from "./helpers/seed-anonymous";

// 모든 spec은 chromium 우선 — modifier+drag는 Firefox/WebKit에서 sensor 동작 차이 가능.
// 다른 browser는 별도 PR에서 sweep.
test.use({ viewport: { width: 1280, height: 800 } });

const WEEK = currentWeekMondayKST();

const SESS_A: SeedSession = {
  id: "sess-a",
  subjectId: "sub-1",
  weekday: 0,
  startsAt: "09:00",
  endsAt: "10:00",
  weekStartDate: WEEK,
  enrollmentIds: ["enr-1"],
  yPosition: 1,
};
const SESS_B: SeedSession = {
  id: "sess-b",
  subjectId: "sub-1",
  weekday: 0,
  startsAt: "11:00",
  endsAt: "12:00",
  weekStartDate: WEEK,
  enrollmentIds: ["enr-2"],
  yPosition: 1,
};
const SESS_C: SeedSession = {
  id: "sess-c",
  subjectId: "sub-1",
  weekday: 0,
  startsAt: "13:00",
  endsAt: "14:00",
  weekStartDate: WEEK,
  enrollmentIds: ["enr-3"],
  yPosition: 1,
};

async function readSessions(page: Page): Promise<SeedSession[]> {
  return await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("classPlannerData:anonymous");
      if (!raw) return [] as unknown as SeedSession[];
      const parsed = JSON.parse(raw);
      return (parsed.sessions ?? []) as SeedSession[];
    } catch {
      return [] as unknown as SeedSession[];
    }
  });
}

test.describe("Multi-select + drag — Desktop (Chromium)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Modifier+drag sensor behavior varies; Chromium-only for now",
  );

  test.beforeEach(async ({ page }) => {
    await seedAnonymous(page, makeDefaultSeed([SESS_A, SESS_B, SESS_C]));
    await page.goto("/schedule");
    await page.waitForSelector('[data-testid="time-table-grid"]', { timeout: 15000 });
    // 모든 SessionBlock 렌더 대기
    await page.waitForSelector('[data-testid="session-block-sess-a"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="session-block-sess-b"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="session-block-sess-c"]', { timeout: 5000 });
  });

  test("T1 — Shift+click 2개 → SelectionBar appears with count=2", async ({ page }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    const bar = page.locator('[data-testid="selection-bar"]');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("2");
    // 선택된 세션 visual (✓ check)
    await expect(
      sessionBlock(page, "sess-a").locator('[data-testid="session-selected-check"]'),
    ).toBeVisible();
    await expect(
      sessionBlock(page, "sess-b").locator('[data-testid="session-selected-check"]'),
    ).toBeVisible();
  });

  test("T2 — Cmd+click 2개도 동일하게 toggle", async ({ page }) => {
    await sessionBlock(page, "sess-a").click({ modifiers: ["Meta"] });
    await sessionBlock(page, "sess-b").click({ modifiers: ["Meta"] });
    await expect(page.locator('[data-testid="selection-bar"]')).toContainText("2");
  });

  test("T3 — 평click → Edit modal (selection 없을 때)", async ({ page }) => {
    await sessionBlock(page, "sess-a").click();
    await expect(page.locator('[data-testid="edit-session-modal"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("T4 — Esc → 선택 해제", async ({ page }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    await expect(page.locator('[data-testid="selection-bar"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="selection-bar"]')).not.toBeVisible();
  });

  test("T5 — SelectionBar [모두 해제] → clear", async ({ page }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    await page.locator('[data-testid="selection-bar-clear"]').click();
    await expect(page.locator('[data-testid="selection-bar"]')).not.toBeVisible();
  });

  test("T6 — 50개 max — 51번째 선택 시도 시 토스트 (시드 51개 필요한 시나리오라 skip)", async ({
    page,
  }) => {
    test.skip(true, "51 sessions seed + click loop는 별도 spec — 본 spec은 일반 시나리오 위주");
  });

  test("T7 — SelectionBar [삭제] → 선택 sessions 삭제 + undo 토스트", async ({
    page,
  }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    await page.locator('[data-testid="selection-bar-delete"]').click();
    // bulk delete: 두 세션이 DOM에서 제거됨 (sess-c만 남음)
    await expect(sessionBlock(page, "sess-a")).toHaveCount(0);
    await expect(sessionBlock(page, "sess-b")).toHaveCount(0);
    await expect(sessionBlock(page, "sess-c")).toBeVisible();
    // undo 토스트 visible
    await expect(page.locator("text=/되돌리기/")).toBeVisible({ timeout: 3000 });
  });

  test("T8 — 삭제 후 [되돌리기] → sessions 복원", async ({ page }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    await page.locator('[data-testid="selection-bar-delete"]').click();
    await expect(sessionBlock(page, "sess-a")).toHaveCount(0);
    // 토스트가 mount + button이 클릭 가능 상태가 될 때까지 wait — 회귀 가드
    // (T7은 visible 검증만 했고, T8은 검증 없이 바로 click하던 race로 dev에서 fail).
    const undoBtn = page.getByRole("button", { name: "되돌리기" });
    await expect(undoBtn).toBeVisible({ timeout: 3000 });
    await undoBtn.click();
    // 두 세션 복원
    await expect(sessionBlock(page, "sess-a")).toBeVisible({ timeout: 3000 });
    await expect(sessionBlock(page, "sess-b")).toBeVisible({ timeout: 3000 });
  });

  test("T9 ⭐ 3개 선택 + drag → 3개 모두 이동 (사용자 보고된 race 회귀 가드)", async ({
    page,
  }) => {
    // 사전 — 3개 세션 모두 월요일 (weekday=0) 09:00, 11:00, 13:00 (yPosition=1)
    await shiftClickAll([
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
      sessionBlock(page, "sess-c"),
    ]);
    await expect(page.locator('[data-testid="selection-bar"]')).toContainText("3");

    // anchor: sess-b (월 11:00). drop target: 화 12:00 (delta +1 weekday, +60min)
    // Drag는 grip(`session-drag-handle`)에서만 활성 (dnd-kit listeners spread 위치)
    const target = dropCell(page, 1, "12:00");
    await sessionBlock(page, "sess-b").hover(); // grip 활성화
    await plainDrag(page, sessionDragHandle(page, "sess-b"), target);

    // localStorage에서 직접 검증 — 모든 N개가 batch 적용됐는지 확인
    await page.waitForTimeout(800); // updateData + sync 완료 대기
    const sessions = await readSessions(page);
    expect(sessions).toHaveLength(3);

    const a = sessions.find((s) => s.id === "sess-a")!;
    const b = sessions.find((s) => s.id === "sess-b")!;
    const c = sessions.find((s) => s.id === "sess-c")!;

    // delta: weekday 0→1 (+1), startsAt 11:00→12:00 (+60min)
    // sess-a: 0,09:00 → 1,10:00
    // sess-b: 0,11:00 → 1,12:00 (anchor, 정확히 target)
    // sess-c: 0,13:00 → 1,14:00
    expect(b.weekday).toBe(1);
    expect(b.startsAt).toBe("12:00");
    expect(a.weekday).toBe(1);
    expect(a.startsAt).toBe("10:00");
    expect(c.weekday).toBe(1);
    expect(c.startsAt).toBe("14:00");
  });

  test("T10 — 단일 Cmd-drag → 원본 그대로 + 새 session 추가 (count +1)", async ({
    page,
  }) => {
    const before = await readSessions(page);
    expect(before).toHaveLength(3);

    // sess-a를 Cmd+drag로 화 11:00에 복사
    const target = dropCell(page, 1, "11:00");
    await sessionBlock(page, "sess-a").hover();
    await modifierDrag(page, sessionDragHandle(page, "sess-a"), target, "Meta");
    await page.waitForTimeout(1000);

    const after = await readSessions(page);
    expect(after).toHaveLength(4); // +1 copy
    // 원본 sess-a 보존
    const orig = after.find((s) => s.id === "sess-a")!;
    expect(orig.weekday).toBe(0);
    expect(orig.startsAt).toBe("09:00");
    // 새 copy는 다른 ID로 화 11:00에 존재
    const copy = after.find(
      (s) => s.id !== "sess-a" && s.weekday === 1 && s.startsAt === "11:00",
    );
    expect(copy).toBeTruthy();
  });

  test("T11 — 2개 선택 + Cmd-drag → 2 originals stay + 2 copies", async ({
    page,
  }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    // anchor: sess-a (월 09:00) → 화 10:00 (delta +1 weekday, +60min)
    const target = dropCell(page, 1, "10:00");
    await sessionBlock(page, "sess-a").hover();
    await modifierDrag(page, sessionDragHandle(page, "sess-a"), target, "Meta");
    await page.waitForTimeout(1000);

    const sessions = await readSessions(page);
    expect(sessions).toHaveLength(5); // 3 original + 2 copies

    // 원본 보존
    const origA = sessions.find((s) => s.id === "sess-a")!;
    const origB = sessions.find((s) => s.id === "sess-b")!;
    expect(origA.weekday).toBe(0);
    expect(origA.startsAt).toBe("09:00");
    expect(origB.weekday).toBe(0);
    expect(origB.startsAt).toBe("11:00");
    // 새 2개는 화요일에 새 시간으로
    const newCopies = sessions.filter(
      (s) => !["sess-a", "sess-b", "sess-c"].includes(s.id),
    );
    expect(newCopies).toHaveLength(2);
    const wd1 = newCopies.filter((s) => s.weekday === 1);
    expect(wd1).toHaveLength(2);
    expect(wd1.find((s) => s.startsAt === "10:00")).toBeTruthy();
    expect(wd1.find((s) => s.startsAt === "12:00")).toBeTruthy();
  });

  test("T11c ⭐ contiguous 분배 정책 — 추종은 anchor 의 group 내 상대 위치 기준 yPos 보존", async ({
    page,
  }) => {
    // 정책 (2026-05-15 변경, Option D 폐기, adr/014): 다중 선택 drag/copy 시
    // sortedByYPos asc 기준 contiguous yPos 분배 — group 의 시각 순서 (왼쪽→오른쪽
    // lane) 가 anchor 위치 무관하게 보존됨. 사용자 보고 (2026-05-15, Image 8/9 Case B):
    //   "5 개 같은 시간 sessions group 멀티선택 → 가장 오른쪽 anchor 드래그 → 결과
    //    순서가 학생 ID asc (2,3,4,5,1) 로 깨짐. 사용자 의도: visual order (5,4,3,2,1)."
    //
    // 본 test 시나리오 (단순 2 sessions): sess-a (yPos=1, anchor) + sess-b (yPos=3).
    // sortedByYPos=[sess-a, sess-b], anchorRelIdx=0.
    // drop newYPosition=1 (dropCell 첫 매칭) → sess-a=1, sess-b raw=1+(1-0)=2.
    // 이전 D 정책 = 1 강제. 이전 원래 yPos 보존 정책 = 3.
    // 본 정책 = anchor 상대 위치 기준 → sess-b yPos >= 2.

    await page.evaluate((week) => {
      const raw = localStorage.getItem("classPlannerData:anonymous");
      if (!raw) return;
      const data = JSON.parse(raw);
      const sessB = (data.sessions ?? []).find(
        (s: { id: string }) => s.id === "sess-b",
      );
      if (sessB) {
        sessB.yPosition = 3;
        sessB.weekStartDate = week;
      }
      data.lastModified = new Date().toISOString();
      localStorage.setItem("classPlannerData:anonymous", JSON.stringify(data));
    }, WEEK);
    await page.reload();
    await page.waitForSelector('[data-testid="time-table-grid"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="session-block-sess-b"]', { timeout: 5000 });

    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );

    // anchor sess-a (월 09:00) → 화 10:00 lane 1
    const target = dropCell(page, 1, "10:00");
    await sessionBlock(page, "sess-a").hover();
    await modifierDrag(page, sessionDragHandle(page, "sess-a"), target, "Meta");
    await page.waitForTimeout(1200);

    const sessions = await readSessions(page);
    const newCopies = sessions.filter(
      (s) => !["sess-a", "sess-b", "sess-c"].includes(s.id),
    );
    expect(newCopies).toHaveLength(2);
    const sessBCopy = newCopies.find(
      (s) => s.weekday === 1 && s.startsAt === "12:00",
    )!;
    expect(sessBCopy).toBeTruthy();

    // 핵심 회귀 가드 (Option D 폐기): 추종은 contiguous yPos. anchor=1 + relIdx=1
    // → sess-b raw=2. 1 강제(D 정책) X, 3 원래 보존(이전 이전 정책) X.
    expect(sessBCopy.yPosition).toBeGreaterThanOrEqual(2);
  });

  test("T12 — Cmd-drag 도중 DragOverlayCard에 data-copy='true'", async ({
    page,
  }) => {
    const target = dropCell(page, 1, "11:00");
    await sessionBlock(page, "sess-a").hover();
    await startDragAndHover(
      page,
      sessionDragHandle(page, "sess-a"),
      target,
      "Meta",
    );
    // drag 중 DragOverlayCard render
    const overlay = page.locator('[data-testid="drag-overlay-card"]');
    await expect(overlay).toBeVisible({ timeout: 2000 });
    await expect(overlay).toHaveAttribute("data-copy", "true");
    await finishDrag(page, "Meta");
  });

  test("T11b ⭐ bulk copy 충돌 회귀 가드 — 기존 세션과 같은 (요일/시간) 위치에 복사 시 자동 lane 재배치", async ({
    page,
  }) => {
    // 사용자 보고 사고 (2026-05-04): 다중 선택 + Cmd-drag로 기존 세션 위치에
    // 복사하면 시각적 stack overlap 발생. 단일 add는 repositionSessionsUtil 호출하지만
    // multi-copy는 호출 안 함이 회귀.
    //
    // 시나리오: sess-d가 화 10:00 lane 1에 미리 존재. sess-a + sess-b 선택 후
    // Cmd-drag(anchor sess-a, 월 09:00 → 화 10:00) → sess-a copy가 화 10:00에
    // 떨어지면서 sess-d와 충돌. 자동으로 lane 2(또는 다른 lane)로 push되어야 함.
    //
    // 주의: beforeEach의 seed는 page.addInitScript라 reload 시 덮어쓰기됨. 본 테스트는
    // grid가 이미 렌더된 상태에서 React state로 추가 (직접 localStorage write +
    // page navigate 안 함).

    // 새 sess-d를 localStorage에 추가하고 reload 대신 페이지 navigate 안 하고
    // useIntegratedDataLocal의 reload 트리거 — 사실 가장 robust한 건 storage event
    // 발생시켜 react가 재로드하게 하는 것. 그러나 storage event는 같은 탭 내에서
    // 발생 안 함. 대신: 다중 select 동작을 sess-d 없이 진행하고, 충돌 검증은
    // 새 copy끼리의 yPosition 분리로 검증한다.
    //
    // 변경된 시나리오: sess-a + sess-b + sess-c 모두 선택. anchor sess-a (월 09:00)을
    // 월 11:00으로 Cmd-drag. delta +0 weekday, +120min.
    //   - sess-a copy → 월 11:00 (이미 sess-b가 lane 1에 있음 → 충돌)
    //   - sess-b copy → 월 13:00 (이미 sess-c가 lane 1에 있음 → 충돌)
    //   - sess-c copy → 월 15:00 (충돌 없음)
    // 회귀 가드: 새 copy들의 yPosition이 기존 sess-b/sess-c와 다르거나 (또는
    // 기존이 다른 lane으로 push됨)이어야 visual stack overlap이 안 생김.

    await shiftClickAll([
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
      sessionBlock(page, "sess-c"),
    ]);

    // anchor sess-a (월 09:00) → 월 11:00 (delta +0 weekday, +120min)
    // sess-a copy → 월 11:00 → sess-b(월 11:00)와 충돌 → 다른 lane
    // sess-b copy → 월 13:00 → sess-c(월 13:00)와 충돌 → 다른 lane
    // sess-c copy → 월 15:00 → 충돌 없음
    const target = dropCell(page, 0, "11:00");
    await sessionBlock(page, "sess-a").hover();
    await modifierDrag(page, sessionDragHandle(page, "sess-a"), target, "Meta");
    await page.waitForTimeout(1500);

    const sessions = await readSessions(page);
    // 원본 3개 + 새 copy 3개 = 6개 (모든 시간이 음수 아님)
    expect(sessions).toHaveLength(6);

    // 회귀 가드 핵심: 같은 (weekday, startsAt)에 있는 sessions은 yPosition이 모두 달라야 함
    // (충돌 자동 재배치되었음을 의미). 이전 버그는 새 copy가 기존과 같은 yPosition으로
    // 떨어져 visual stack overlap 발생.
    const groupByTimeWeekday = new Map<string, number[]>();
    for (const s of sessions) {
      const key = `${s.weekday}|${s.startsAt}`;
      const list = groupByTimeWeekday.get(key) ?? [];
      list.push(s.yPosition ?? 1);
      groupByTimeWeekday.set(key, list);
    }
    for (const [key, yPositions] of groupByTimeWeekday) {
      const unique = new Set(yPositions);
      expect(
        unique.size,
        `(weekday|startsAt)=${key} 위치에 ${yPositions.length}개 sessions이 같은 yPosition 사용 — 시각 overlap 회귀`,
      ).toBe(yPositions.length);
    }
  });

  test("T10b ⭐ Cmd+drag 회귀 가드 — 시작 시 Cmd, drag 도중 Cmd 풀어도 복사로 drop", async ({
    page,
  }) => {
    // 사용자 보고 사고 (2026-05-04): macOS Cmd+drag가 native drag 시작 시 잠깐
    // window blur를 발생시켜 useDragController의 isCopyMode가 false로 reset되고,
    // drop 시점엔 라우팅이 move로 빠짐. 해결: drag start 시점의 modifier를 ref에
    // latch해 routing은 시작 시점 의도를 따름.
    const before = await readSessions(page);
    expect(before).toHaveLength(3);

    const target = dropCell(page, 1, "11:00");
    await sessionBlock(page, "sess-a").hover();
    await modifierDragReleasedMidway(
      page,
      sessionDragHandle(page, "sess-a"),
      target,
      "Meta",
    );
    await page.waitForTimeout(1000);

    const after = await readSessions(page);
    // 복사이므로 sessions 수 +1, 원본 sess-a 그대로
    expect(after).toHaveLength(4);
    const orig = after.find((s) => s.id === "sess-a")!;
    expect(orig.weekday).toBe(0); // 원본 안 움직임 (= 복사 발화 증거)
    expect(orig.startsAt).toBe("09:00");
    // 새 copy가 화 11:00에 존재
    const copy = after.find(
      (s) => s.id !== "sess-a" && s.weekday === 1 && s.startsAt === "11:00",
    );
    expect(copy).toBeTruthy();
  });

  test("T13 — 2개 선택 drag 시 DragOverlayCard에 stack + count badge", async ({
    page,
  }) => {
    await shiftClickBoth(
      sessionBlock(page, "sess-a"),
      sessionBlock(page, "sess-b"),
    );
    const target = dropCell(page, 1, "10:00");
    await sessionBlock(page, "sess-a").hover();
    await startDragAndHover(page, sessionDragHandle(page, "sess-a"), target);
    const overlay = page.locator('[data-testid="drag-overlay-card"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute("data-multi-count", "2");
    await finishDrag(page);
  });
});

// T17 — Mobile long-press 메뉴
//
// **Skipped — 별도 spec에서 다룸**
//
// Reason: 모바일 viewport(<sm)에서 schedule 페이지가 ScheduleDailyView로 자동 전환되는데,
// 이 컴포넌트는 SessionBlock이 아닌 별도 daily-session 렌더러를 사용 (`data-testid="daily-session-${id}"`).
// long-press 핸들러가 다른 위치에 있어 본 spec의 setup 패턴(time-table-grid + session-block)이
// 그대로 적용되지 않음.
//
// Long-press 메뉴 자체의 동작은 SessionBlock의 unit test로 커버되어 있음 (PR #201).
// 모바일 e2e는 별도 spec(`schedule-mobile-context-menu.spec.ts`)으로 분리 권장.
