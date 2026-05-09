# ADR-012: Fire-and-forget vs Await for CUD Operations

**Date**: 2026-05-09  
**Status**: Accepted  
**Context owner**: HYUNJIN

## 배경

class-planner는 Local-first 패턴: localStorage 즉시 반영 + 서버 sync는 `apiSync.ts`의 `fireAndForget` 헬퍼로 비동기 발사. 응답성 0ms 확보가 design 목표.

`fireAndForget` 자체는 reliable delivery (10회 retry + outbox enqueue)를 가지지만 **호출자에게 응답을 돌려주지 않음**. 호출 직후 다음 줄 즉시 실행.

## 사고 (UAT 2026-05-09)

학생/강사/과목/세션 삭제 시 5초 deferred-commit 패턴:
1. localStorage 즉시 제거
2. `pendingDeletes`에 entity ID 영속화 + 5초 timer
3. 5초 후 commit timer fires → `syncXxxDelete()` (fire-and-forget) → **즉시** `removePendingDelete()`
4. 다음 mount cycle의 `useGlobalDataInitialization` server fetch + Phase 1 sync 결정

문제 시점: commit 직후 server DELETE in-flight 동안 (~100~300ms) `pendingDeletes` 비어있음. 그 사이 `useGlobalData`가 server fetch하면 학생이 살아있는 snapshot 받음 → filter 못 함 → `setClassPlannerData(serverData)` → **부활**.

omni-radar로 정확한 race window 식별:
```
10:00:48.471  pendingDeletes 비움 (commit 후)
10:00:48.609  storage write에 학생 3명 ← 부활 시점 (138ms 후)
```

같은 사고가 5사이클 반복 (PR #314, #315, #317, #318) — 매번 sync 결정 분기만 약화하다 PR #319/#320에서 race window 자체를 await으로 제거.

## 결정

### 1. Critical CUD는 await으로 commit
사용자 데이터 변경 (Create/Update/Delete) 중 **다른 sync 메커니즘과 race 가능한 흐름**은 server response를 await한 후에만 후속 정리(예: `removePendingDelete`).

```ts
// Before (fire-and-forget — race window 존재)
syncXxxDelete(userId, id);
removePendingDelete(...);  // 즉시 — server 응답 안 기다림

// After (await — race window 0)
const response = await fetch(`/api/${entity}/${id}?...`, { method: "DELETE" });
if (response.ok) {
  removePendingDelete(...);
}
// 실패 시 pendingDeletes 그대로 → 다음 mount의 recovery hook이 자동 재시도
```

### 2. fireAndForget 헬퍼는 그대로 유지하되 사용 범위 한정
`apiSync.ts`의 `fireAndForget`은 다음 케이스에 한정:
- 로그/텔레메트리 등 **non-critical**, 잃어도 안전한 데이터
- 다음 작업이 결과에 의존하지 않는 흐름
- 사용자가 결과 인지 안 하는 background task (예: `notifySelfSync` 신호)

CUD 흐름의 commit 시점은 await 의무.

### 3. 실패 시 reliable delivery 유지
await로 commit하다가 server fail 발생 시:
- `pendingDeletes`에 entity ID 그대로 유지 → 다음 mount의 recovery hook이 자동 재시도
- silent failure 방지 + 사용자 데이터 손실 0
- 재시도 한계 없음 (사용자가 페이지 mount하는 한 계속 시도)

## 트레이드오프

### 잃는 것
- commit 시점 응답성 200~500ms 추가 latency
  - 단 사용자 visible UI는 이미 0ms (localStorage 즉시 반영). commit은 background 5초 timer 후라 사용자에게 invisible.
- network slow 시 commit timer 만료가 지연 — 영향 없음 (사용자가 다른 작업 진행 중)

### 얻는 것
- race window 0 — 다른 sync 메커니즘 (useGlobalData, polling, self_sync 등)과 부정합 발생 안 함
- silent failure 감지 가능 — 응답 status 확인
- 정합성 우선

## 사용 가이드라인 (개발자)

### 새 entity / 새 sync 흐름 추가 시 점검
1. **Critical 여부**: 사용자 데이터인가? (CUD)
2. **다른 sync와 race 가능한가?**: useGlobalData, useScheduleMeta polling, self_sync, storage event 등
3. **실패 인지가 중요한가?**: 사용자가 알아야 하는 작업인가?

위 셋 중 하나라도 yes → **await으로 commit + pendingDeletes 영속화 패턴 의무**.

### Anti-pattern (부활 사고 5회 반복 원인)
- ❌ fire-and-forget commit + 즉시 pending state 제거
- ❌ commit 직후 다른 sync 메커니즘 발동 시점 인지 안 함
- ❌ 시간 기반 휴리스틱 (5초만 기다리면 server에 도달했을 것)으로 race 안전 가정

### 적용 사례
- ✅ `useStudentManagementLocal` recovery + deleteStudent commit (PR #319)
- ✅ `useTeacherManagementLocal` recovery + deleteTeacher commit (PR #319)
- ✅ `useSubjectManagementLocal` recovery + deleteSubject commit (PR #319)
- ✅ `useIntegratedDataLocal` session recovery + deleteSession + bulkDeleteSessions (PR #320)

### 회귀 가드
- 단위 테스트: `useGlobalDataInitialization.test.ts`에 강지원/박태환 시나리오 정확히 재현 — 같은 race 재발 시 CI red
- ADR (이 문서): 새 entity 추가 시 의사결정 기록 의무

## 관련 PR
- PR #314, #315, #317: Phase 1 sync 분기 fix (표면 수정 — root cause 못 잡음)
- PR #318: detectPartialCorruption 분기 제거 + loading gate
- **PR #319**: pendingDeletes commit await — 학생/강사/과목 race window 제거
- **PR #320**: session 삭제 await — 같은 패턴 audit 후 일관 적용

## 참고
- learning-journal/2026-05-09.md — Fire-and-forget vs await 트레이드오프 + omni-radar timeline 디버그
- src/lib/apiSync.ts — fireAndForget 헬퍼 (retry + outbox)
- src/lib/pendingDeletes.ts — 영속화 + recovery 패턴
