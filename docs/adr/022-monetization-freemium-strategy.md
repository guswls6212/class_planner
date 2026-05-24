# ADR 022 — Monetization 전략: Freemium + Usage·협업·안전망 Gating

- 상태: 채택 (2026-05-24)
- 결정자: HYUNJIN
- 관련 문서: `docs/strategy/monetization.md`, `docs/strategy/data-roadmap.md`, mockup `/design-explorations/monetization-strategy`

## Context

class-planner 의 수익화 전략을 결정해야 함. 친구 (학원 운영자 + 와이프 공동 운영) 가 첫 production 사용자로 선공개 예정 — Phase 1 시작.

배경 이슈:
- AWS Lightsail + Supabase + 트래픽 인프라 비용 — 계속 무료는 불가능
- AI 시대로 코드/생산 가치 0 수렴 — 어떻게 차별화 + 유료 전환?
- 한국 학원 SaaS 시장에 무료 옵션 다수 — 초기 진입 시 비교 우위 만들기 어려움
- 광고 vs 프리미엄 — 어느 채널?

## 대안

### 대안 A — 즉시 유료 (2-3개월 무료 후 유료 전환)

- 사용자 확보 초기에 유료 전환 — 빠른 매출
- 문제: 무료 경쟁자 다수 — 초기 사용자 확보 자체 어려움. critical mass 못 만듦
- 데이터 flywheel 시작 못 함 = AI 시대 핵심 moat 못 만듦

### 대안 B — 광고 모델

- 학부모 share 페이지에 광고
- 문제: B2B SaaS 광고 효과 매우 낮음. 학원 운영자 신뢰 손상. 학원이 서비스 이탈
- ARPU < 1000원/월 예상 (CPM 낮음)

### 대안 C — 무기한 무료 + 결제 수수료만 (Outcome only)

- 모든 기능 무료. 학원비 결제 통합 시 수수료
- 문제: PG 계약 + 정산 인프라 필요 (Phase 3 까지 시간). Phase 1-2 동안 매출 0

### 대안 D (채택) — 무료 진입 + Usage + 협업 + 안전망 3-trigger Freemium

- Phase 1 100% 무료 → critical mass 확보
- Phase 2 부터 Premium (월 14,900원) 부분유료화
  - **Usage trigger**: 학생 30명 limit
  - **협업 trigger**: 강사·관리자 초대는 paid (Figma 패턴)
  - **안전망 trigger**: 강사 휴지통 30일 / 자동 백업 7일 한도 (Dropbox 패턴)
- Phase 3 결제 통합 → 수수료 1.5% 게임 체인저

## 결정

**대안 D 채택.**

근거 (데이터 + 시장):
1. **Small biz SaaS freemium 변환율 6-10%** (전체 평균 1-5%) — small biz 타겟에 적합
2. **AI 시대 moat = 데이터 flywheel** — 사용자 확보 (Phase 1) 없이는 데이터 누적 불가능 → moat 못 만듦
3. **무료 경쟁자 (클래스업/공선학관/랠리즈)** 다수 — 초기 진입 시 무료 진입 필수
4. **인프라 비용** 학원 100명 수준 월 5-10만원 — Phase 1 본인 부담 가능
5. **3-trigger 조합** = 변환율 거의 2배 (role-based feature gating 5.1% 사례)

## ⚠️ Known Risks & Alternatives

**Weaknesses**:
1. Phase 1 동안 매출 0 — runway 압박 가능
2. Premium 가치 판단이 잘못되면 변환율 저조 가능
3. 결제 통합 (Phase 3) 까지 시간 — Phase 2 ARR 만으로는 인프라 비용 break-even 보장 X

**Rejected alternatives**:
- 대안 A (즉시 유료) — 무료 경쟁자 환경에서 초기 진입 어려움
- 대안 B (광고) — B2B SaaS 효과 X + 학원 신뢰 손상
- 대안 C (수수료 only) — Phase 3 까지 매출 0, 너무 늦음

**Uncertainties**:
- 결제 통합 시점 (Phase 3) — PG 계약 / 정산 인프라 / KYC 등 소요 시간 미확정
- B2C 확장 (Phase 4+) 의 critical mass — 학원 1000곳 도달 시점 미확정
- 광고 partnership (교재·보험) 가능성 — Phase 3+ 검토

## 영구 영향 (Layer 별)

### 코드
- `useScheduleMeta`, `data-snapshots`, `teachers.archived_at` 등 — Free/Premium 분기 추가 (Phase 2)
- 새 `subscriptions` 테이블 + Stripe / 토스 결제 통합 (Phase 2)
- `feedback` 테이블 + Sidebar 피드백 채널 (Phase 1)

### 인프라
- Analytics (Plausible 또는 Vercel) — anonymous, GDPR-safe (Phase 1)
- Sentry — production 에러 모니터링 (Phase 1)
- Supabase cron job — Layer 2 자동 purge (Phase 2)
- 별도 schema `analytics` + nightly ETL (Phase 3)

### 약관 / 법적
- 가입 약관 — 4-Layer 데이터 보관 정책 명시
- DPA 위탁 처리자 계약 — 학원이 처리자, class-planner 가 위탁 처리자
- Right to Erasure 응대 흐름 + Privacy policy

### 데이터 모델
- Free / Premium 구분 — `academy_subscriptions` 테이블
- Layer 2 retention — `data_snapshots.expires_at` 컬럼
- Layer 3 cold storage — Supabase Storage 또는 S3 Glacier
- Layer 4 analytics schema — anonymized aggregate

## Phase별 Gate

각 Phase 다음으로 가려면 KPI 충족 필요:

- Phase 1 → 2: WAU 100+ 학원, NPS 50+, in-app 피드백 채널 작동 중
- Phase 2 → 3: 유료 학원 10+, 변환율 3-5%, 결제 통합 인프라 준비 완료
- Phase 3 → 4: 유료 학원 100+, ARR 1억원+, churn < 5%, 학원 1000+ critical mass

각 Gate 미충족 시 다음 Phase 보류 + 전 Phase 보강.

## 변경 이력

- 2026-05-24: 채택 (mockup `/design-explorations/monetization-strategy` 동기, docs/strategy/ 영구화)
