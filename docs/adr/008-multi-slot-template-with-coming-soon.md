# ADR-008: 다중 슬롯 템플릿 (학원당 2개) + "추후 업데이트 예정" UI

**Date:** 2026-05-05
**Status:** Accepted
**Supersedes:** [ADR-004](./004-week-isolation-and-single-template.md) — partial. weekStartDate 격리는 유지, "학원당 1개 템플릿" 정책만 변경.

## Context

ADR-004 (PR #121, 2026-04-30) 가 "학원당 1개 템플릿" 정책을 도입. 당시 이유: "5명 규모 학원에서 복잡도 대비 사용성 이점 없음 — 향후 확장 가능".

T1 cycle (2026-05-05, PR #242·#243) 의 사용자 burn 진단으로 **사용성 이점이 실제로 확인**됨:

- 사용자 발화: "학원하나당 하나만 저장할수있나? 최대 2개까지 저장할수있게하고…"
- 학원 운영 패턴 — 시간표가 단일 패턴이 아닌 다중 (학기중 vs 방학 / 정상 vs 백업 / 자유 라벨링) 사용 시나리오 확인

다만 monetization (paywall / 결제) 은 timing 부적절:
- 사용자 5명 baseline 단계 — 활성 사용자 30+ 명 시점까지 paywall 도입은 가설 검증 부족 (학습일지 5/5 의 "검증 없이 빌드 NO-GO" 룰)
- "데이터 쌓이면 AI 도입" 식 cold start 함정과 동일 패턴 회피

## Decision

### 1. 학원당 슬롯 수 — **2개 고정 (free tier)**

- DB: `templates` 테이블에 `slot_index INT NOT NULL` 컬럼 추가 (0 또는 1)
- `(academy_id, slot_index)` unique constraint
- API POST quota check: `count(*) >= 2` 시 reject

### 2. 슬롯 3-N — **"추후 업데이트 예정" disabled UI**

- SlotPickerModal 의 슬롯 3, 4, 5 가 disabled (lock 아이콘)
- 라벨: **"추후 업데이트 예정"** (paywall / 결제 없음을 명확히 — "결제 X, 곧 출시" 형태로 사용자 혼란 회피)
- 향후 paywall 도입 결정 시 이 UI 가 자연스러운 unlock point

### 3. 슬롯 라벨 — **`name` 컬럼 활용 (자유 입력)**

- 별도 `slot_label` 컬럼 추가 X — 기존 `templates.name` 활용 (PR #121 시 도입)
- 기본값: "슬롯 1" / "슬롯 2"
- 사용자 의도: 학기중/방학 / 정상/백업 / 임의 명명 모두 자유

### 4. 기존 dead row 정리 (F4)

- 현진학원 templates 3개 (5/4 14:08 "테스트템플릿" + 5/4 20:12 "기본템플릿" + 5/5 15:28 "기본템플릿") 중 created_at DESC 상위 2개 keep + 1개 삭제
- migration `033_multi_slot_template.sql` 의 step 2 에서 처리 (dry-run 검증 필수)

### 5. handleSaveTemplate 분기 변경

- 현재: `if (activeTemplate) PUT else POST` (single-slot)
- 변경: SlotPickerModal (mode="save") → 빈 슬롯 또는 기존 슬롯 선택 → POST (slot_index 명시) 또는 PUT
- 적용 시: 메뉴 위 chip bar 의 active slot 자동 적용

## Alternatives Considered

### Paywall 도입 (free 1-2 / paid N) — Reject

- 5명 baseline 에서 monetization timing 부적절
- 검증 없이 빌드 NO-GO 룰 (학습일지 5/5 의 Test mgmt SaaS 시장 조사)
- billing 시스템 (Stripe etc) 도입 비용 + 운영 부담 + 가설 검증 미흡

### Unlimited slots — Reject

- complexity 미리 수용 비효율 (현재 1개 academy + 5명 사용자)
- 향후 unlock 시점 결정 자유도 손실 (hard limit 없으면 정책 변경 어려움)

### 1슬롯 유지 (ADR-004) — Reject (본 ADR 의 supersede 대상)

- 사용자 burn (T1) 으로 UX 미해결 확인
- "5명 규모에서 복잡도 대비 이점 없음" 가설이 사용자 발화로 기각됨

### JSONB 내 `slotIndex` (no schema change) — Reject

- 정규형 위반 (분리 가능한 metadata 를 JSONB 에 묻음)
- 인덱싱 불가 → `(academy_id, slot_index)` quota check 의 query 비용 ↑
- query 복잡 (`template_data->>'slotIndex'`)

### 별도 `template_slots` 조인 테이블 — Reject

- 과도한 정규화 (academies + template_slots + templates 3 단계)
- 1:N 의 1쪽이 academies 인데, slot 자체는 academies 의 속성 — 별도 테이블 분리 의미 ↓

## Consequences

### 긍정

- **UX 해결**: 학원 운영의 다중 시간표 패턴 (학기중/방학 등) 자유 사용
- **API payload 명확화**: slot_index 명시로 race condition / ordering 모호성 제거
- **향후 unlock point 자연**: paywall 도입 시 SlotPickerModal 의 disabled 슬롯이 자연스러운 unlock UI

### 부정

- **slot 3+ 학습 곡선**: 사용자가 "왜 3번부터 잠겨있나?" 인지 가능 — 명확한 카피 ("결제 X, 곧 출시") 로 완화
- **migration 부담**: step 1 (slot_index 추가) + step 2 (F4 cleanup) + step 3 (slot_index 재할당) + step 4 (unique constraint) 의 atomic transaction 필수. mitigation: BEGIN/COMMIT + Supabase MCP `execute_sql` 으로 dry-run 후 적용
- **API quota check 추가**: POST 마다 `count(*)` query 1회 추가 — 인덱스 (`idx_templates_academy_slot_unique`) 로 성능 영향 미미

### 우려 (T2 머지 후 모니터링)

- **multi-slot 활용도**: 5명 baseline 에서 실제로 2 슬롯 사용하는지 1-2주 user feedback 으로 검증. 활용 0 이면 default UI 단순화 검토 (예: 2번째 슬롯 hidden until "+추가" 클릭).

## Related

- [ADR-004](./004-week-isolation-and-single-template.md) — single-template 정책 (본 ADR 가 partial supersede)
- 메모리 `project_class_planner_t2_design.md` — 사용자 결정 보존
- 학습일지 2026-05-05 — T1 cycle (사용자 burn 진단 + 결정 컨텍스트)
- 후속 ADR (가설): paywall 도입 결정 시 ADR-009 — slot N 확장 + billing 시스템
