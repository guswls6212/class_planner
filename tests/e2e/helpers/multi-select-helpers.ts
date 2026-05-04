import type { Locator, Page } from "@playwright/test";

/**
 * 다중 선택 helper. SessionBlock의 click 핸들러는 Shift/Ctrl/Meta+click을
 * onSelectToggle로 분기.
 */

/**
 * 두 SessionBlock을 Shift+click으로 다중 선택.
 * Playwright `click({ modifiers })`는 native click을 호출하므로 dnd-kit과 무관.
 */
export async function shiftClickBoth(
  first: Locator,
  second: Locator,
): Promise<void> {
  await first.click({ modifiers: ["Shift"] });
  await second.click({ modifiers: ["Shift"] });
}

/**
 * N개 locator 모두 Shift+click — 임의 갯수 다중 선택.
 */
export async function shiftClickAll(locators: Locator[]): Promise<void> {
  for (const loc of locators) {
    await loc.click({ modifiers: ["Shift"] });
  }
}

/**
 * SessionBlock의 testid pattern. 신규 시드 데이터에서 일관 사용.
 */
export function sessionBlockSelector(id: string): string {
  return `[data-testid="session-block-${id}"]`;
}

/**
 * SessionBlock locator helper (id로) — wrapper element. click 용도.
 */
export function sessionBlock(page: Page, id: string): Locator {
  return page.locator(sessionBlockSelector(id));
}

/**
 * SessionBlock의 drag handle (inner grip) locator. Drag 용도.
 *
 * dnd-kit useDraggable의 listeners가 이 grip element에만 spread되어 있음.
 * 외부 wrapper(setDragRef ref만)에서는 drag activation 안 됨.
 *
 * Grip은 `opacity-0 group-hover:opacity-60`이라 default hidden이지만 Playwright는
 * .hover() / mouse 상호작용 시점에 force-visible 처리되므로 drag 가능.
 */
export function sessionDragHandle(page: Page, id: string): Locator {
  return page.locator(
    `${sessionBlockSelector(id)} [data-testid="session-drag-handle"]`,
  );
}

/**
 * Drop target locator — TimeTableCell의 testid pattern.
 * `data-testid="time-table-cell-${weekday}-${time}"` (e.g. "time-table-cell-0-09:00")
 *
 * weekday: 0=월 ~ 6=일
 * time: "HH:MM" 형식
 *
 * yPosition별 cell이 여러개 있을 경우 첫 번째(yPosition=1)를 잡음.
 */
export function dropCell(
  page: Page,
  weekday: number,
  time: string,
): Locator {
  return page.locator(`[data-testid="time-table-cell-${weekday}-${time}"]`).first();
}
