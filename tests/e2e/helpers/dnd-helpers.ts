import type { Locator, Page } from "@playwright/test";

/**
 * dnd-kit + Playwright drag 헬퍼.
 *
 * - PointerSensor의 activation distance(기본 8px) 보장 위해 mouse.move를 명시적
 *   step으로 진행
 * - modifier 키는 mouse.down 이전에 keyboard.down — pointerdown 이벤트의
 *   ctrlKey/metaKey 플래그가 true가 되도록
 * - dnd-kit은 activatorEvent를 drag start 시점에 capture하므로 위 순서가 critical
 */

async function elementCenter(loc: Locator): Promise<{ x: number; y: number }> {
  const box = await loc.boundingBox();
  if (!box) throw new Error("Locator has no bounding box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Modifier 없이 from → to drag.
 * dnd-kit pattern: hover → mouse.down → 8px+ move → final position → up.
 */
export async function plainDrag(
  page: Page,
  from: Locator,
  to: Locator,
): Promise<void> {
  const start = await elementCenter(from);
  const end = await elementCenter(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // dnd-kit activation distance trigger
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

/**
 * Modifier 키 누른 상태로 drag.
 * @param modifier 'Meta' (macOS Cmd) 또는 'Control' (Win/Linux Ctrl)
 *
 * 순서:
 *   1) keyboard.down(modifier) — pointer event의 metaKey/ctrlKey 플래그 활성
 *   2) mouse.move → mouse.down → activation distance → final → up
 *   3) keyboard.up(modifier)
 *
 * dnd-kit이 activatorEvent에서 modifier 플래그를 읽는 것을 검증.
 */
export async function modifierDrag(
  page: Page,
  from: Locator,
  to: Locator,
  modifier: "Meta" | "Control" = "Meta",
): Promise<void> {
  const start = await elementCenter(from);
  const end = await elementCenter(to);
  await page.keyboard.down(modifier);
  try {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  } finally {
    await page.keyboard.up(modifier);
  }
}

/**
 * Drag를 끝내지 않고 hover 위치까지 이동만 — DragOverlayCard 시각 검증용.
 * 호출자가 page.mouse.up()으로 명시적 종료해야 함.
 */
export async function startDragAndHover(
  page: Page,
  from: Locator,
  to: Locator,
  modifier?: "Meta" | "Control",
): Promise<void> {
  const start = await elementCenter(from);
  const end = await elementCenter(to);
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
}

/**
 * startDragAndHover로 시작한 drag 정리. modifier 누른 채로 시작했으면 같은 키로 호출.
 */
export async function finishDrag(
  page: Page,
  modifier?: "Meta" | "Control",
): Promise<void> {
  await page.mouse.up();
  if (modifier) await page.keyboard.up(modifier);
}

/**
 * 회귀 가드용 — Cmd를 시작 시에만 잡고 drag 도중 풀어버린 뒤 drop 하는 시나리오.
 *
 * 사용자 보고 사고 (2026-05-04): macOS Cmd+drag 시 native drag 시작 시점에 짧은
 * window blur가 발생해 useDragController의 onBlur가 isCopyMode=false 처리 →
 * drop 시 라우팅이 move로 갔음. 시작 시점 latch(ref) 도입 후엔 시작 의도가 보존돼야 함.
 */
export async function modifierDragReleasedMidway(
  page: Page,
  from: Locator,
  to: Locator,
  modifier: "Meta" | "Control" = "Meta",
): Promise<void> {
  const start = await elementCenter(from);
  const end = await elementCenter(to);
  await page.keyboard.down(modifier);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // dnd-kit activation 거리 트리거 (이 시점에 dragstart 발화 + activatorEvent에 metaKey:true)
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
  // 의도적으로 drag 도중에 modifier 해제 (live isCopyMode false로 흐름)
  await page.keyboard.up(modifier);
  // 계속 drag 이동
  await page.mouse.move(end.x, end.y, { steps: 8 });
  // drop
  await page.mouse.up();
}
