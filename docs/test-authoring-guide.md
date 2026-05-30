# class-planner — Test Authoring Guide (Flaky 회피)

> 본 가이드는 신규/수정 spec 파일 작성 시 PreToolUse hook 이 자동 inject 한다
> (`dev-pack/scripts/hooks/test-authoring-guide-hook.sh`). Claude 는 이 가이드를
> 읽은 후 코드 작성 — flaky 8 원칙 위반을 사전 차단.

## TL;DR — 8 원칙

| # | 원칙 | 핵심 |
|---|------|------|
| 1 | **명시적 대기** | `waitForTimeout` 금지. `expect.poll`, `waitForFunction`, `waitForResponse`, `expect(...).toBeVisible({timeout})` |
| 2 | **테스트 격리** | `beforeEach` 깨끗한 상태 + `afterEach` cleanup. globalTeardown 의존 |
| 3 | **고유 데이터** | `Date.now()`, `crypto.randomUUID()` prefix. hardcoded "홍길동" 금지 |
| 4 | **안정 selector** | `data-testid` + `getByRole`. CSS class (`.bg-amber-500`) 의존 금지 |
| 5 | **Retry 보수적** | `playwright.config.ts` 의 `retries: CI ? 2 : 0` 그대로. retry 로 진짜 버그 마스킹 X |
| 6 | **외부 의존성 mock** | `page.route` 또는 `injectRealSession()` 둘 중 의식적 선택 |
| 7 | **애니메이션** | opacity transition 안 끝난 상태에서 visible 가정 X. `waitOneFrame` 또는 명시적 검증 |
| 8 | **비동기 await** | 모든 mutation 호출은 `await`. fire-and-forget 은 `void` prefix 명시 (ADR-012) |

---

## 1. 명시적 대기 (timing 의존성)

### ❌ 금지 패턴
```ts
await page.click("button");
await page.waitForTimeout(1000);
expect(await page.textContent(".result")).toBe("Success");
```
**문제**: CI 부하 시 1초 미달 → race. 무 부하 시 0.3초면 됨에도 1초 소모.

### ✅ 권장 패턴
```ts
// (a) 조건 기반 — 상태가 도달할 때까지
await expect.poll(async () => readSessions(page).length).toBe(3);

// (b) DOM 가시성
await expect(page.locator(".result")).toBeVisible({ timeout: 3000 });

// (c) 네트워크 응답
await page.waitForResponse(
  async (res) => res.url().includes("/api/sessions") && res.status() === 200,
);

// (d) localStorage debounce 등 짧은 stabilization
await waitOneFrame(page); // requestAnimationFrame 1회
```

### class-planner 헬퍼
- `tests/e2e/scroll-position-preservation.spec.ts` 의 `waitOneFrame(page)` — RAF 1 사이클
- `tests/e2e/scroll-position-preservation.spec.ts` 의 `readSavedScrollPosition(page)` — `expect.poll` 과 조합
- `tests/e2e/schedule-multi-select-drag.spec.ts` 의 `readSessions(page)` — `expect.poll(() => readSessions(page).length).toBe(N)`

---

## 2. 테스트 격리 (state pollution 회피)

### Playwright E2E
```ts
test.beforeEach(async ({ page }) => {
  await seedAnonymous(page, makeDefaultSeed([SESS_A, SESS_B]));
  await page.goto("/schedule");
  await page.waitForSelector('[data-testid="time-table-grid"]');
});

// real-RLS spec 은 try/finally 로 cleanup
test("...", async ({ page }) => {
  await injectRealSession(page);
  try {
    // test body
  } finally {
    await clearSecondAcademies(); // orphan sweep
  }
});
```

- `globalSetup.ts` + `globalTeardown.ts` (`cleanupTestUserData`) 가 spec 단위 cleanup 보장 — child first (session_enrollments → sessions → enrollments → ...) + FK RESTRICT 처리.
- 새 entity 추가 시 `scripts/cleanup-test-data.ts` 에 cleanup 함수 추가 의무.

### Vitest unit
```ts
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```
- `src/setupTests.ts` 의 글로벌 afterEach 활용. 추가 cleanup 필요 시 spec 별 `afterEach`.

---

## 3. 고유 데이터

### ❌ 금지
```ts
const student = { name: "홍길동", email: "test@test.com" };
```

### ✅ 권장
```ts
const ts = Date.now();
const student = { name: `E2E학생_${ts}`, email: `test_${ts}@test.local` };
// 또는 UUID
const id = crypto.randomUUID();
```

class-planner 패턴:
- `tests/e2e/final-working-test.spec.ts:L151-152` "E2E테스트${Date.now()}"
- `tests/e2e/helpers/seed-academy-data.ts` `seedSecondAcademy` 멱등성 — 동일 name 으로 UPSERT (PR #401 사고 회복 패턴).

**예외**: fixture 단위 격리 (`sess-a`, `sub-1`) 가 보장되면 hardcoded ID OK. 단, multi-parallel spec 환경에서 academy-scope 격리 필수.

---

## 4. 안정 selector

### ❌ 금지
```ts
await page.click(".btn-primary.large.shadow-md"); // CSS class 변경 시 깨짐
```

### ✅ 권장
```ts
// (a) data-testid — 의도 명시
await page.click('[data-testid="add-student-btn"]');

// (b) 의미 기반
await page.getByRole("button", { name: /수업 추가/ });
await page.getByLabel("학생 이름");
```

class-planner: `[data-testid="time-table-grid"]` (105회), `[data-testid="session-block-{id}"]` (sess-a 등 spec 별 고유). `getByRole` 119회. CSS class 의존은 helper 내부에만.

---

## 5. Retry (보수적)

`playwright.config.ts:8` 의 `retries: process.env.CI ? 2 : 0` 그대로 유지. retry 횟수 증가는 진짜 버그 마스킹 위험 — flaky 의 root cause 직접 fix 우선.

---

## 6. 외부 의존성 mock

### Anonymous mode (시드)
```ts
import { seedAnonymous, makeDefaultSeed } from "./helpers/seed-anonymous";
await seedAnonymous(page, makeDefaultSeed([SESS_A]));
// localStorage 만 사용 — 서버 호출 없음. 빠름, 결정적.
```

### Real-RLS (Supabase)
```ts
import { injectRealSession } from "./helpers/auth-mock";
await injectRealSession(page);
// session.json + useMyRole cache pre-seed (PR #357) — race window 0
```

### Selective route mock
```ts
await page.route("**/api/share-tokens**", (route) => {
  route.fulfill({ status: 200, body: JSON.stringify({ token: "abc" }) });
});
// 진짜 API 안 부르고 가짜 응답 — 외부 API 결정성 보장
```

**판단 기준**:
- RLS / multi-academy / 권한 회귀 가드 → **real-RLS** (가장 강함)
- UI 동작 + 데이터 변형 → **anonymous seed**
- 외부 시스템 (Supabase 외) → **selective route mock**

---

## 7. 애니메이션 / transition

### ❌ 함정
```ts
await page.click("button"); // 모달 fade-in 0.3초
expect(await page.isVisible(".modal")).toBe(true); // opacity 0 인 상태일 수 있음
```

### ✅ 권장
```ts
await page.click("button");
await expect(page.locator(".modal")).toBeVisible({ timeout: 1000 });
// 또는 transition 완료 대기
await waitOneFrame(page);
await waitOneFrame(page); // 2 프레임 (CSS transition 일부)
```

dnd-kit 드래그:
- `tests/e2e/helpers/dnd-helpers.ts` 의 `plainDrag` / `modifierDrag` / `startDragAndHover` + `finishDrag` 사용 의무.
- activation distance (8px) 처리 + modifier key order 보장.
- 직접 `page.mouse.down` / `mouse.up` 호출은 helper 안에서만.

---

## 8. 비동기 await + ADR-012

### ESLint
`@typescript-eslint/no-floating-promises: warn` (Phase 1, PR #403). Phase 2 (37 위반 fix 후 error 승격) 진행 중. `docs/future-work/no-floating-promises-escalate-to-error.md`.

### 패턴
```ts
// (a) CUD commit — await 의무 (race window 회피, ADR-012)
await syncStudentDelete(uid, id);
clearPendingDeletes(id);

// (b) 의도적 fire-and-forget — void prefix + 1줄 주석
void trackAnalyticsEvent({ ... }); // analytics — 실패 무시 OK

// (c) 테스트 — promise resolve 검증
await expect(saveStudent(data)).resolves.toBeDefined();
```

### 금지 패턴
```ts
saveStudent(data); // ⚠️ await 누락 — silent race
expect(await getStudents()).toContain(...);
```

---

## class-planner 헬퍼 인벤토리

| 파일 | 헬퍼 | 용도 |
|---|---|---|
| `tests/e2e/helpers/dnd-helpers.ts` | `plainDrag`, `modifierDrag`, `startDragAndHover`, `finishDrag` | dnd-kit 활성화 거리 + modifier 키 처리 |
| `tests/e2e/helpers/multi-select-helpers.ts` | `shiftClickBoth`, `shiftClickAll`, `sessionBlock`, `sessionDragHandle`, `dropCell` | 다중 선택 + 드래그 시드 |
| `tests/e2e/helpers/seed-anonymous.ts` | `seedAnonymous`, `makeDefaultSeed`, `currentWeekMondayKST` | localStorage 직접 시드 (anonymous 모드) |
| `tests/e2e/helpers/auth-mock.ts` | `injectRealSession`, `auth-mock pre-seed academyId` | Supabase RLS 검증 (real session) |
| `tests/e2e/helpers/seed-academy-data.ts` | `seedSecondAcademy`, `clearSecondAcademies` | multi-academy 환경 멱등 시드 + sweep |
| `scripts/cleanup-test-data.ts` | `cleanupTestUserData` | globalTeardown 자동 호출 — FK 순서 + orphan |
| `tests/e2e/scroll-position-preservation.spec.ts` | `readSavedScrollPosition`, `waitOneFrame` | localStorage debounce 검증 + RAF 1 사이클 wait |
| `tests/e2e/schedule-multi-select-drag.spec.ts` | `readSessions` | `expect.poll` 과 조합해 sessions 변화 검증 |

---

## 새 spec 추가 시 체크리스트

작성 직전 확인:
- [ ] `waitForTimeout` 사용 안 함 (조건 기반 wait 또는 `waitOneFrame`)
- [ ] `data-testid` 또는 `getByRole` 사용 (CSS class selector X)
- [ ] hardcoded 데이터 → `Date.now()` 또는 UUID prefix
- [ ] `beforeEach` / `afterEach` 또는 globalSetup/Teardown 의존
- [ ] CUD 호출은 `await` (fire-and-forget 은 `void` prefix + 주석)
- [ ] dnd 동작은 helper 사용 (직접 mouse.down/up 호출 X)
- [ ] 모달 등 transition 은 명시적 visibility wait
- [ ] 신규 entity 시 `cleanupTestUserData` 에 cleanup 추가 (FK 순서 준수)

---

## 참고

- ADR-012: fire-and-forget vs await for CUD (`docs/adr/012-fire-and-forget-vs-await-for-cud.md`)
- PR #319 / #320: useStudentManagementLocal / useIntegratedDataLocal 마이그레이션 (race window 0)
- PR #357: auth-mock pre-seed academyId race fix
- PR #400 / #401: multi-academy E2E 환경 멱등성 + orphan sweep
- PR #403: `no-floating-promises` warn 도입 (Phase 1)
- PR #404: waitForTimeout 17곳 → 조건 기반 wait
- `docs/future-work/no-floating-promises-escalate-to-error.md`: Phase 2 escalation 트리거
