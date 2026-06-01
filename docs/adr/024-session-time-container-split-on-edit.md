# ADR-024 — 세션 = 시간 그릇, 학생 블록은 split-on-edit

- Status: Accepted
- Date: 2026-06-01
- 관련: proposal `per-student-block-split`, mockup `internal-dashboard/design-explorations/class-planner/per-student-block` (A 채택), ADR-012(fire-and-forget vs await)

## Context

schedule-v2(공부방 모델)에서 그리드는 **enrollment 마다 블록**을 그린다
(`scheduleViewModel.buildScheduleVM`, blockId = `sessionId:enrollmentId`). 그러나 시간은
`sessions` 행의 `starts_at/ends_at` **한 값**에만 있고 `session_enrollments`(조인)에는
시간 컬럼이 없다. 따라서 한 세션에 2명+가 묶이면(레거시 `/schedule` GroupSessionModal·시드
산물), 한 학생의 시간을 편집/삭제하면 **같은 세션의 전원이 함께 이동·삭제**된다.

공부방은 같은 과목이라도 학생별 시간이 제각각(중간 합류·조기 하교)이라 학생별 독립
이동이 필수. 실데이터 확인 결과 2~5명 그룹 세션이 광범위(예: session 169dc266 = 이서준·
정수아·최민준 사회 화 14:00–15:00). 신규 경로(`addSession`/`bulkAdd`)는 이미 1인 세션.

## Decision

블록 편집/삭제를 **(sessionId, enrollmentId) 쌍** 기준으로 처리한다(split-on-edit):

- **편집**: 세션 enrollment 가 1명이면 제자리 수정. 2명+면 그 enrollment 를 **새 1인 세션**
  (새 시간/강사)으로 분리하고 원본 `enrollmentIds` 에서 제거 → 그 학생만 이동, 나머지 유지.
- **삭제**: 1명이면 세션 통째 삭제(undo 토스트 경로). 2명+면 원본에서 그 enrollment 만 제거.
- enrollment(학생↔과목)는 불변 — 시간 그릇(session)만 분리. 신규 enrollment 생성 없음.
- 순수 로직은 `src/app/schedule/_utils/studentBlockEditHelpers.ts`
  (`planStudentBlockEdit` / `planStudentBlockDelete` / `buildSessionSyncPayload`).
- sync: split 시 원본 `syncSessionUpdate`(full payload) + 신규 `syncSessionCreate`.
  `/api/sessions/[id]` PUT 은 enrollmentIds+subjectId+weekday+start+end **full payload 필수**
  (부분 PUT 금지 — `buildSessionSyncPayload` 가 보장). 기존 schedule-v2 편집이 보내던
  부분 payload(시간/강사만)는 server 400 잠재 버그였고 본 변경으로 함께 해소.

## Alternatives (rejected)

- **B — 전체 1인 세션 정규화(일괄 마이그레이션)**: 기존 그룹을 한 번에 N개 1인 세션으로
  분리. 진입 즉시 전부 독립하나, 대량 fire-and-forget sync 가 충돌 파이프라인을 그 볼륨으로
  통과한 적 없음(미검증) + 그룹 개념 폐기 + blast radius 큼. 사용자 체감은 A와 거의 동일.
  필요 시 후속 옵션("이번 주 전부 1인으로 풀기" 버튼)으로 보류.
- **C — `session_enrollments` 에 학생별 시간 오버라이드 컬럼**: 그룹 유지 + 학생별 시간 둘 다
  가능하나 DB 스키마 변경(수동 머지) + VM/편집/sync/PDF 전반 `override ?? 세션` fallback +
  코드·proposal 의 "1인 세션" 방향과 상충. 유지보수 부담 최대.

## Consequences

- 데이터가 건드릴 때마다 점진적으로 1인 세션으로 수렴. DB 스키마/마이그레이션 0.
- 기존 그룹은 첫 편집 전까지 묶여 있음(사용자에겐 비가시 — 옮기면 즉시 분리). 그룹 통째
  이동은 N번 편집(공부방엔 드묾).
- 신규 세션 `yPosition` 은 원본 승계 — schedule-v2 그리드는 `packDay` 로 레인을 동적
  패킹하므로 시각 충돌 없음(yPosition 은 레거시 /schedule 용).
- 그룹 수업(교실 모델)은 폐기하지 않음 — 안 건드리면 유지.
