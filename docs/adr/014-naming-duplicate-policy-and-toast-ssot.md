# ADR-014: 동명이인 정책 일관성 (DB UNIQUE 제거) + Toast SSOT (Layout)

- **Status:** Accepted
- **Date:** 2026-05-10
- **Related PR:** #338 (`chore/uat-2026-05-10-release`), #339 (`fix/uat-2026-05-10-modal-toast`), #340 (`feat/subject-add-detail-modal`)
- **Related ADR:** ADR-011 (Migration discipline), ADR-012 (fire-and-forget vs await), ADR-013 (anonymous migration entity 누락 가드)

## Context

UAT 2026-05-10 진행 중 두 가지 회귀가 동시에 발견됨.

### (1) 강사 동명이인 추가 500 에러

사용자가 `/teachers`에서 기존 강사 "김학성"(이메일 A, 전화 A)와 별도 인물인 동명이인 강사 "김학성"(이메일 B, 전화 B)을 추가 시도 → "강사 추가 동기화 3회 실패" 토스트 + 헤더 큐 재시도 표시.

omni-radar 13:47:56–13:50:35 추적:
- localStorage: 강사 추가 성공 (`count=2`)
- POST `/api/teachers` → **HTTP 500** `INTERNAL_ERROR` (cause `[object Object]`로 직렬화 실패)
- 10회 retry 모두 500 → outbox 이동

Supabase MCP로 직접 schema 조회 → `teachers_academy_id_name_key UNIQUE (academy_id, name)` 제약 발견. 그러나 application 정책(UAT 2026-05-10에서 결정한 `TeacherApplicationServiceImpl`)은 **이름 + 이메일 + 전화 모두 일치 시에만 동일인**으로 간주. 코드는 동명이인 row를 새로 INSERT하려 하지만 DB가 거부 → PostgreSQL 23505 → 500.

비교:
- `students`: UNIQUE 없음 (UAT 2026-05-10에 동명이인 등록 가능 확인됨)
- `subjects`: UNIQUE 없음

**`teachers`만 정책-스키마 비대칭.**

### (2) 추가 토스트 중복 (과목/학생/강사)

PR #338 이전 — 같은 entity에서 `useXxxManagementLocal` hook과 `XxxPageLayout.handleAdd` 양쪽이 모두 토스트를 띄워 화면에 메시지가 2개 노출.

근본 원인: hook은 비즈니스 로직(localStorage write + 서버 sync) 책임이지만 토스트도 같이 띄움 → layout이 0건/1건+ 분기 메시지(과목은 select 안내, 학생/강사는 동명이인 모달)를 컨트롤하면서 같은 sequence에 토스트 한 번 더 발화.

## Decision

### D1: `teachers_academy_id_name_key` UNIQUE 제거

`043_drop_teachers_unique_name.sql` 마이그레이션. application service의 `isTeacherDuplicate(name+email+phone)` idempotent get-or-create가 **유일한** 진짜 중복 차단. students/subjects와 일관성 회복.

진짜 중복(이름+이메일+전화 모두 일치) 입력은 `TeacherApplicationServiceImpl.addTeacher`의 사전 조회로 기존 row 반환. DB 측 보호장치 없음 → application service에 가드를 의무 보장하는 책임이 옮겨감.

### D2: Toast SSOT은 Layout, Hook은 Silent

규칙:
- `useXxxManagementLocal` hook은 **localStorage write + 서버 sync + 로깅만** 담당. UI 피드백 토스트 호출 금지.
- 토스트 발화는 호출부(`XxxPageLayout.handleAdd` / `handleAddDetail` / `SchedulePage` 등)의 책임.
- 메시지 포맷은 호출부가 분기 컨텍스트(0건 vs 1건+, 빠른 추가 vs 상세 모달)에 맞춰 결정.

호출 경로별 토스트 발화 책임:
| Entity | 빠른 추가(0건) | 빠른 추가(1건+) | 상세 모달 |
|---|---|---|---|
| 학생 | `handleAdd` | 안내 토스트 + 모달 | `handleAddDetail` |
| 강사 | `handleAdd` | 안내 토스트 + 모달 | `handleAddDetail` |
| 과목 | `handleAdd` | 안내 토스트 + select | `handleAddDetail` |

PR #339에서 `handleAddDetail` 토스트 누락 회귀 fix하면서 본 규칙을 명문화.

## Consequences

### 긍정적
- **정책-스키마 일치 보장.** 새 entity 추가 시 application 정책과 DB schema audit이 의무 (ADR-011 Migration discipline 보강).
- **토스트 중복 사고 종결.** 새 entity의 hook 작성 시 `showToast` import 자체 금지로 회귀 가드.
- **Test 단순화.** Hook 단위 테스트에서 토스트 mock 불필요. Integration 테스트에서 layout 흐름만 검증.

### 부정적 / 위험
- DB UNIQUE가 없어졌으므로 application service 외 우회 경로(직접 SQL, 다른 service)로 진짜 중복이 INSERT될 수 있음. 현재 `getServiceRoleClient()` 우회 경로는 application service만 → 제한적이지만 **신규 admin 도구 추가 시 가드 의무**.
- `cause` 직렬화 사고(`[object Object]`)는 별도 fix(`serializeCause` in `httpErrors.ts`)로 처리. Supabase PostgrestError 등 비-Error 객체에서 `code/message/details/hint` 추출.

### Migration audit 의무 (ADR-011 보강)
정책 변경 시 다음 의무:
1. application service의 중복 검출 로직 변경
2. DB UNIQUE / CHECK 제약 audit
3. 다른 entity (students/subjects/teachers/sessions) 동일 패턴 일관성 확인

본 사건은 (1)만 진행되고 (2)(3)이 누락된 결과.

## Rejected Alternatives

- **동명이인 금지로 정책 회귀** — Why not: 학원 운영 도메인 현실(같은 이름 강사 흔함)에 안 맞음 + students/subjects와 비대칭 발생.
- **API에서 23505만 200 swallow** — Why not: 업스트림 정책 위반을 데이터 계층에서 가린다는 안티패턴. 다른 unique 제약 위반(invite_tokens.token 등)도 같이 무시될 위험.
- **Hook을 silent하지 않고 layout과 토스트 분기 합의** — Why not: 호출부마다 0건/1건+ 분기 + 모달 흐름이 달라 hook이 모든 컨텍스트를 알 수 없음. 단일 책임으로 분리.

## Verification

- DB: `SELECT conname FROM pg_constraint WHERE conname = 'teachers_academy_id_name_key'` → 0행 (Supabase MCP 적용 후 검증됨, 2026-05-10)
- 코드: `useStudentManagementLocal.ts`, `useSubjectManagementLocal.ts`, `useTeacherManagementLocal.ts`에서 추가 분기의 `showToast("success", ...)` 호출 부재 확인
- E2E 회귀 가드: 동명이인 추가 + 토스트 발화는 manual UAT (`uat-checklist.md` S-2/3/4)로 회귀 가드
