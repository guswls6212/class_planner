# `@typescript-eslint/no-floating-promises` warn → error 승격

## 도입 배경

ADR-012 (`docs/adr/012-fire-and-forget-vs-await-for-cud.md`) 는 CUD critical path 에서 fire-and-forget 호출의 race window 문제를 명시. PR #319/#320 에서 모든 deletion commit 을 `await` 패턴으로 마이그레이션해 race window 0 달성. 하지만 ESLint 가드 부재로 신규 코드에서 동일한 함정에 빠질 수 있음.

`@typescript-eslint/no-floating-promises` 가 type-aware 로 누락된 await 를 잡아주는 표준 lint rule. 본 PR (chore/lint-no-floating-promises) 에서 **Phase 1: warn 도입** 적용.

## 현재 상태 (Phase 1, 2026-05-19)

- `eslint.config.mjs`: `"@typescript-eslint/no-floating-promises": "warn"` 적용
- **기존 위반 약 37건** (warning 으로 표시, CI 통과)
- PR review 시점에 신규 위반 즉시 인지 가능

## Phase 2 — error 승격 트리거

다음 조건 충족 시 `eslint.config.mjs` 의 rule severity 를 `"error"` 로 승격:

1. 기존 37건 모든 위반 fix 완료
2. 위반 fix 가 의도적 fire-and-forget (`void` prefix 또는 `fireAndForget()` 헬퍼) 적용 또는 진정한 `await` 추가 중 어느 것인지 ADR-012 체크리스트 통과
3. CI 1주일 안정 — flaky 회귀 없음

## 위반 fix 가이드

각 위반 라인을 다음 4가지 중 하나로 분류:

### (a) 의도적 fire-and-forget (대다수)
- 사용자에게 즉시 응답이 중요하고, mutation 실패가 outbox/retry 로 복구 가능한 경우
- 해결: `void` prefix 추가 또는 `fireAndForget(callee)` 헬퍼

```ts
// before
syncSessionCreate(uid, newSession);

// after — 의도 명시
void syncSessionCreate(uid, newSession);
```

### (b) await 필요 (CUD commit)
- ADR-012 의 deferred-commit + await 패턴 적용 대상
- 해결: `await` 추가, 상위 호출자도 `async` 로 변경

```ts
// before — race window
syncStudentDelete(uid, id);
clearPendingDeletes(id);

// after — server response 후 정리
await syncStudentDelete(uid, id);
clearPendingDeletes(id);
```

### (c) 테스트 promise 누락
- spec/test 코드에서 `expect(...).resolves` 또는 `await` 빠진 경우
- 해결: `await` 추가

### (d) 의도적 무시 + 주석 필요
- 진짜 결과를 무시해도 되는 케이스 (analytics fire-and-forget 등)
- 해결: `void` + 1-line 주석 (이유)

```ts
void trackAnalyticsEvent({ ... }); // analytics — 실패 무시 OK (사용자 영향 없음)
```

## 우선순위 (분류별 작업 chunk)

- **P0** (race window risk): hooks/useStudentManagementLocal, useSubjectManagementLocal, useIntegratedDataLocal — ADR-012 미러
- **P1** (production): app/api/**, app/schedule/** — 사용자 path
- **P2** (test code): src/**/__tests__/**, tests/integration/** — flaky 잠재
- **P3** (design exploration): app/design-explorations/** — 비프로덕션, 가장 마지막

각 chunk 별로 별도 PR — review burden 분산.

## 관련

- ADR-012: fire-and-forget vs await for CUD
- PR #319/#320: useStudentManagementLocal / useIntegratedDataLocal 마이그레이션
- 이번 PR (chore/lint-no-floating-promises): Phase 1 warn 도입
