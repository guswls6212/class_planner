# ADR-013: anonymous→로그인 마이그레이션은 모든 user-facing entity 의무 포함

- **Status:** Accepted
- **Date:** 2026-05-09
- **Related PR:** #322 (`fix/anonymous-mig-teachers`)
- **Related ADR:** ADR-012 (fire-and-forget vs await for CUD)

## Context

class-planner의 anonymous → 로그인 마이그레이션 파이프라인(`src/lib/auth/fullDataMigration.ts`)이 도입 시 **students / subjects / enrollments / sessions** 4개 entity만 처리하고 **teachers는 누락**된 채 운영됐다.

UAT 2026-05-09 시나리오 2.5에서 사용자가 anonymous 모드의 `/schedule` 인라인 모달로 학생 3명, 과목 1개, 강사 2명(김학성·김민철), 수업 1개를 입력 후 UAT 계정으로 로그인 → 학생 일괄 삭제 진행. 사용자는 학생 삭제 cascade로 강사도 사라졌다고 인지하고 보고했다.

omni-radar 추적 결과:

- 11:08:27 anonymous에서 강사 2명 추가 — `classPlannerData:anonymous` write에 `teachers:[김학성, 김민철]` 정상 저장됨
- 11:09:55~11:09:59 로그인 후 마이그레이션 — `syncedCounts: {students:3, subjects:1, enrollments:3, sessions:1}` (**teachers 키 자체 부재**)
- 11:10:25 server fetch → `serverEntityCounts.teachers = 0` 확정
- 그 후 server 데이터로 local 덮어써져 `local.teachers = 0`이 영구화

즉 사용자가 본 "강사 삭제" 현상은 학생 삭제 cascade와 인과관계가 없으며, **마이그레이션 파이프라인이 처음부터 강사를 옮기지 않은 누락**이 root cause였다. 추가로 session POST body에 `teacherId`도 reconcile 누락이라 anonymous에서 강사를 수업에 연결했던 상태도 끊겼다.

## Decision

**anonymous → 로그인 마이그레이션은 user-facing entity 전체(students, subjects, teachers, enrollments, sessions) 포함을 의무로 한다.** 또한 entity 간 연결 필드(`session.teacherId` 등)도 reconcile 책임은 마이그레이션 파이프라인이 진다.

### 의무 사항

1. `MigrationSyncResult.syncedCounts`에 모든 entity 카운트 노출.
2. 각 entity 마다 dedup 헬퍼(`findDuplicate*`) + idMap + POST 흐름 갖춤.
3. 의존성 순서 명시 — 현재: students → subjects → teachers → enrollments → sessions. (sessions가 `teacherId` reconcile 위해 teachers 뒤에 와야 함.)
4. e2e 회귀 가드 1개 이상 — PR #322는 `fullDataMigration.test.ts`에 4개 케이스 추가 (정상 mig + dedup + 매핑 누락 시 FK 보호 + teacherId 없는 session).
5. 신규 entity 추가 PR review 체크리스트에 "마이그레이션 Step 추가됐는가?" 포함.

## Consequences

### Positive

- anonymous 모드의 사용자 의도가 로그인 후 server에 보존됨.
- session-teacher 연결도 보존돼 UI에서 강사 색상/이름 표시 일관.
- 신규 entity 추가 시 마이그레이션 누락이 PR review에서 자연 catch.

### Negative

- 마이그레이션 파이프라인 길이가 entity 수에 비례. 5개에서 6개로 약 20% latency 증가 (entity 0~수십개 규모라 무시 가능).
- e2e 가드 maintenance 비용.

### Risks

- 마이그레이션 entity 추가 시 `applyLocalDataChoice`의 `totalSynced` 합산식 동기화 의무 (현재는 4개 entity sum). 새 entity 추가 PR이 합산식을 동시에 갱신하지 않으면 anonymous 키 정리 분기에 영향.

## Alternatives Rejected

### A. server-side migration batch endpoint

`POST /api/migrate-anonymous-data` 같은 batch endpoint로 client 1회 호출. 거부 — client/server 의존 증가, idempotency/dedup 복잡, RLS 검증 어려움. client-driven sequential POST가 단순하고 디버깅 가능.

### B. 강사는 anonymous 모드에서 추가 불가능

UX 차단으로 간단. 거부 — anonymous 사용자가 schedule 인라인으로 학생/과목/강사/수업 모두 입력하는 게 핵심 매력 흐름. 강사만 차단은 비대칭이고 사용자 혼란.

### C. 마이그레이션 누락은 toast 알림으로만 graceful

throw 안 하고 silent 처리 + 사용자에게 토스트 안내. 거부 — 사용자가 강사 사라짐을 직접 인지하기 어렵고, UAT에서 발견됐듯 사후 조사 비용이 큼. anonymous 데이터를 잃지 않는 게 우선.

## References

- PR #322 (`fix/anonymous-mig-teachers`) — Teachers Step + session.teacherId reconcile 추가
- omni-radar 로그 2026-05-09 11:08~11:10 (anonymous teacher 추가 → migration → server.teachers=0)
- ADR-012 (fire-and-forget vs await for CUD) — 본 ADR과 별개 책임이지만 마이그레이션 파이프라인 설계 시 함께 참조
