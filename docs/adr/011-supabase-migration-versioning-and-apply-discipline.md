# ADR-011: Supabase Migration Versioning & Apply Discipline

- **Status**: Accepted
- **Date**: 2026-05-08
- **Decision**: HYUNJIN
- **Context PR**: F 진단 (UAT 2026-05-08), `data_snapshots` 테이블 미적용으로 createSnapshot 500 cascade

## Context

UAT 2026-05-08 사고 분석 중 발견:
- 코드 폴더(`supabase/migrations/`)는 **numeric prefix**(`NNN_name.sql`, e.g. `034_create_data_snapshots.sql`)
- Supabase remote DB의 마이그레이션 메타테이블은 **timestamp 기반**(`20260411143848`)
- 이 두 versioning이 **자동 동기화되지 않음** — 코드 머지 후 Supabase 적용은 별도 단계

결과: PR이 코드 + 마이그레이션 SQL을 함께 머지했음에도 Supabase에는 적용 안 된 상태로 prod 배포됐다. 사용자가 `INSERT INTO data_snapshots`를 시도할 때까지 누락이 보이지 않다가, server log에만 `relation "data_snapshots" does not exist`가 찍히고 클라이언트에는 마스킹된 `"백업 생성 실패"`로 표면화. 충돌 직전 자동 백업이라는 핵심 안전망이 깨진 채로 운영 중이었음.

또 `033_multi_slot_template.sql`도 동시에 누락됐으나 schema는 (다른 경로로) 적용된 상태 — 메타테이블 기록만 빠짐. 적용 흔적 추적 불가능하다는 부수 위험이 드러남.

## Decision

### 1. Numeric prefix 유지
코드 폴더는 `NNN_short_name.sql` 형식 유지. timestamp 전환은 비용 대비 이득 작음 (기존 30+개 파일 rename + git 이력 단절).

### 2. Apply 검증 의무
**PR 머지 직후 Supabase 마이그레이션이 실제로 적용됐는지 명시적으로 확인한다.**

확인 방법:
```bash
# Supabase MCP 또는 CLI로
mcp__claude_ai_Supabase__list_migrations   # → 적용 목록
ls class-planner/supabase/migrations/      # → 코드 목록
diff  # 누락 확인
```

마이그레이션을 포함한 PR을 머지한 사람이 같은 세션 안에서 검증까지 완료한다. **PR 본문 체크리스트에 "Supabase apply 검증 완료" 항목 추가**.

### 3. Apply 실패 시 절차
적용 실패 시:
1. `apply_migration` 재실행 (멱등 SQL이면 안전)
2. SQL 안전성 사전 검토 (특히 DELETE / DROP / non-IF-NOT-EXISTS DDL)
3. 적용 결과를 PR 댓글에 기록 (감사 흔적)

### 4. 누락 정기 점검
월 1회 `list_migrations` vs 코드 폴더 `diff`. 누락 발견 시 ADR-011 절차에 따라 처리.

## Consequences

**Positive**:
- 적용 누락 즉시 발견 (UAT 2026-05-08 같은 silent failure 차단)
- 멱등 SQL 작성 습관 강화 (`IF NOT EXISTS` 가드 등)
- ADR로 명시되어 신규 contributor도 동일 절차 따름

**Negative**:
- PR 머지 후 추가 단계 1개 (검증) — 약 30초 소요
- `apply_migration` MCP 권한 필요 (현재 dev-pack 환경에서는 이미 보유)

**Mitigation**:
- 머지 직후 Claude/CI가 자동 `list_migrations diff`를 돌려 누락 시 PR 댓글 알림하는 자동화는 별도 검토 (ADR-011 후속)

## Rejected Alternatives

### A. Timestamp versioning으로 전환
30+개 파일 rename + git 이력 단절. supabase CLI는 timestamp를 쓰지만 우리 워크플로는 PR-driven이라 numeric이 git diff에서 더 읽기 쉬움. 비용 대비 이득 작음.

### B. CI가 자동 apply
prod DB에 자동 변경은 blast radius 커서 위험. 적용 실패 시 사람이 즉시 판단해야 (rollback / 재시도 / SQL fix) — 자동화는 책임 회피 위험.

### C. 적용 안 된 상태 그냥 둠
schema 누락이 production 사고로 이어진 사례(UAT 2026-05-08)가 있어 받아들일 수 없음.

## References

- Sandbox 진단: `mcp__claude_ai_Supabase__list_tables` + `list_migrations`로 누락 확인 후 `apply_migration("create_data_snapshots", ...)` 적용 (2026-05-08)
- 관련 PR: #286 (root cause fix), #287 (안전망), #288 (graceful), #289/#290 (UI 보강)
- 관련 사고: UAT 2026-05-08 createSnapshot 500 cascade
