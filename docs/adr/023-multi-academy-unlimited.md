# ADR 023 — 다중 학원 무제한 + Premium feature 차별화 (ADR-019 supersession)

- 상태: 채택 (2026-05-24)
- 결정자: HYUNJIN
- 관련 문서: `docs/strategy/monetization.md`, `docs/adr/022-monetization-freemium-strategy.md`
- Supersedes: ADR-019 정책 2 + 정책 3

## Context

ADR-019 (2026-05-20) 의 Academy Singularity (1+1) 정책 — 본인 학원 1개 + 초대 학원
1개 hard limit — 재검토 필요.

배경:
- ADR-022 monetization 전략 검토 중 다중 학원 freemium gating 검토
- 한국 학원 시장 분점 운영자 비율 데이터 부재 → hard gating 위험
- Slack / Linear / Notion / Figma / Calendly 검증 결과 — **본인 organization 수 자체에 limit 둔 SaaS 거의 없음**. 가격은 organization 의 기능/사용량 별.
- 사용자(HYUNJIN) 2026-05-24 명시: "안 X (무제한 무료 + Premium feature 차별화) 채택"

## 대안

### 대안 X (채택) — 무제한 무료 + Premium feature 차별화 (Slack 패턴)

```
Free:    본인 학원 무제한 + 초대 무제한
Premium: + 분점 통합 대시보드 + 분점 간 강사·학생 이동 분석 + 분점 정산 자동화
```

### 대안 Y — 부드러운 gating

```
Free:    본인 학원 2개 + 초대 무제한
Premium: 본인 학원 무제한 + 분점 통합 대시보드
```

### 대안 Z — 현재 유지 (1+1 hard)

```
Free:    본인 학원 1개 + 초대 무제한
Premium: 본인 학원 무제한 + 분점 통합 대시보드
```

## 결정

**대안 X 채택.**

근거:
1. **SaaS 표준 패턴** — 본인 organization 수 자체 gating 은 사용자 신뢰 손상 + viral 효과 막힘
2. **분점 운영자 비율 미확정** — 데이터 없는 상태 hard gating = 위험
3. **Premium 가치는 + feature 로** — 분점 통합 대시보드는 진짜 가치 → 자연 upgrade
4. **현재 비대칭 정합성** — 초대 가입은 무제한이고 본인만 1개 = 일관성 없음. 통일

## ⚠️ Known Risks & Alternatives

**Weaknesses**:
1. 분점 운영자도 Premium 의 핵심 가치 없으면 무료 유지 가능 — ARR 손실 가능
2. 본인 학원 무제한 = 인프라 비용 증가 (학원 N개 = N배 row)
3. Premium "분점 통합 대시보드" 가치가 약하면 변환 실패

**Rejected alternatives**:
- 대안 Y (2개 부드러운 gating) — 2개 limit 의 근거 약함. 임의 정책
- 대안 Z (1개 hard) — SaaS 표준 어긋남. 사용자 신뢰 손상

**Uncertainties**:
- Phase 3 까지 분점 운영자 비율 데이터 누적 → 안 Y/Z 로 재전환 검토 가능
- 분점 통합 대시보드의 진짜 가치 — Phase 2 출시 후 사용량 측정

## 영향 (코드 변경)

### Phase 1 (즉시 본 PR)
- `POST /api/academies` 신규 — 학원 생성 endpoint (현재 미구현)
- `Sidebar.tsx` — "+ 새 학원 만들기" 버튼 활성화 + 모달 trigger
- 신규 `CreateAcademyModal` 컴포넌트
- 학원명 validation (기존 `validateAcademyName` 재사용)
- 학원 생성 시 owner role 으로 academy_members INSERT (정책 1 유지)
- 학원 생성 직후 active_academy switch (UX)

### Phase 2 (이후)
- Premium feature "분점 통합 대시보드" 출시
- 분점 간 강사 / 학생 / 학원비 비교 view
- subscription tier 시점 (Free / Premium) 결제 통합

### 데이터 모델
- 변경 없음 — 기존 `academies` + `academy_members` 그대로
- 학원 row 수만 user 별 증가 (이전 1개 → 무제한)

## Phase Gate

- Phase 1 (본 PR 후): 다중 학원 운영 사용자 수 측정 — analytics
- Phase 2 시작 (3-6개월 후): Premium "분점 통합 대시보드" 출시 + Free 사용자 중 분점 운영자 비율 추정
- Phase 3 (6-12개월): 분점 운영자 비율 > 20% 면 대안 Y 재검토. < 5% 면 대안 X 유지

## 변경 이력

- 2026-05-24: 채택 + ADR-019 정책 2/3 supersession
