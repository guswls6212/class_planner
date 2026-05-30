# class-planner — Data Roadmap (SSOT)

> 데이터 보관 아키텍처 + 인벤토리 + 활용 영역 + 추가 기능 우선순위.
> 시각 mockup: `/design-explorations/monetization-strategy` §⑤c, §⑤d.
> 결정 배경: `docs/adr/014-monetization-freemium-strategy.md`.

## 1. 데이터 보관 4-Layer 아키텍처

**핵심 원칙: 사용자 노출 ≠ Server 측 정책.** 사용자에게는 freemium gating 한도를 안내하되, server 는 익명화된 패턴을 무기한 보관.

| Layer | 보관 기간 | 사용자 접근 | 용도 | 법적 가드 |
|---|---|---|---|---|
| 1. Live data | 무기한 | 항상 가능 | 학원 운영 | 사용자 동의 (서비스 제공) |
| 2. User-visible backup | Free 7일 / Premium 90일 | UI 복구 가능 | 실수 회복 (freemium gating) | UI 한도 명시 |
| 3. Internal retention | 2~3년 | 사용자 숨김 — 운영자만 audit | CS 분쟁, audit log | PIPA 보유기간 + DPA + Right to Erasure |
| 4. Anonymized aggregate | **무기한** (PII 제거) | 사용자 숨김 | 분석, AI 학습, 벤치마크 | 익명화 — PIPA 적용 외 |

### Supabase 구현 가이드

- **Layer 1+2**: 기존 테이블 + `deleted_at TIMESTAMPTZ` + 기존 `data_snapshots` 테이블
- **Layer 3**: 기존 `audit_log` 테이블 + cold storage (Supabase Storage 또는 S3 Glacier, 압축 JSON)
- **Layer 4**: 별도 schema `analytics` + nightly ETL job (PII 제거 + aggregate). cron + Edge Functions
- **Retention enforcement**: Supabase cron job — Layer 2 자동 purge (Free 7일 / Premium 90일), Layer 3 자동 purge (3년). Layer 4 만 무기한
- **비용 추정**: 학원 1000곳 × 10년 = ~1GB → Supabase Pro $25/월 충분. cold storage $5/월 추가

### 법적 가드 (Non-negotiable)

1. **한국 PIPA**: 학생 이름·전화·학부모 정보 = PII. 수집·이용 목적 + 보유 기간 + 동의 가입 약관 명시
2. **DPA 위탁 처리자 계약**: 학원이 "처리자", class-planner 가 "위탁 처리자" — 가입 시 DPA 체결
3. **Right to Erasure**: 사용자 본인 학원 삭제 요청 시 Layer 1~3 즉시 삭제 (Layer 4 는 익명화되어 영향 없음)
4. **k-anonymity**: 개별 학원/학생 식별 불가능한 통계만 Layer 4 로. 학원 N개 미만 그룹은 통계 안 만듦

## 2. 데이터 인벤토리 (12 종류)

| 데이터 | 현재 | 가치 | 활용 |
|---|---|---|---|
| 시간표 (요일·시간·세션) | ✓ | 중 | 시간대별 인기도, 강사 워크로드, AI 자동 최적화 |
| 학생 기본정보 | ✓ | 중 | 학원 규모, 학년 분포, 학교별 수요 |
| 강사 기본정보 + 담당 과목 | ✓ | 중 | 과목 인기도, 강사 1인당 학생 수 |
| 출결 | △ UI 노출 약함 | **높음** | retention 예측, 학생 이탈 신호, KPI |
| 수업료 / 결제 | ✗ | **높음** | 매출, 단가 동향, 미납 패턴, 수익 예측 |
| 학부모 engagement (share view) | △ 부분 | **높음** | 학원 신뢰도, 학부모 활동성, 마케팅 ROI |
| 성적 / 평가 | ✗ | 중 | 학업 성과, 강사별 quality |
| 학생 입학 출처 | ✗ | **높음** | 학원 마케팅 ROI, 채널 효과 |
| 상담 / 메모 | ✗ | 낮음 | 이탈 사전 신호 |
| 수업 노트 (강사→학생) | ✗ | 중 | AI 학생별 progress 요약 |
| 지역 / 학원 위치 | △ 부분 | **높음** | 지역별 시장 분석, B2B 리포트 |
| 시간표 변경 history | ✓ 자동 | 낮음 | 운영 안정성 지표 |

**요약**: 12 종류 중 완전 수집 = 3, 부분 = 3, 미수집 = 6. 미수집 중 4개가 "높음" 가치 — 우선 개발 대상.

## 3. 4사분면 활용 영역

| 영역 | 대상 | 수익 채널 | 예시 회사 |
|---|---|---|---|
| **A. 내부 분석** | 학원 운영자 | Premium 구독 14,900원/월 | Toss 사장님 / Square Analytics |
| **B. B2B 시장 리포트** | 출판사·교육청·프랜차이즈 | 연 1천만~1억원 계약 | Nielsen / SimilarWeb |
| **C. AI flywheel** | class-planner 본인 + Premium | Premium feature + lock-in | GitHub Copilot / Notion AI |
| **D. 마켓플레이스** | 학원 + 외부 partner | 매칭 수수료 5~10% | Wyzant / Preply |

## 4. 추가 기능 우선순위 (Top 10)

| 순위 | 기능 | 데이터 가치 | 구현 노력 | Tier |
|---|---|---|---|---|
| 1 | 출결 관리 (UI 노출 강화) | retention 예측 + KPI | 낮 (이미 backend) | Free + Premium 자동화 |
| 2 | 수업료 / 결제 | 매출 + 단가 + 미납 패턴 | 높 (PG 계약) | Free 기록 + Premium 자동 + 수수료 1.5% |
| 3 | 학부모 소통 (인앱) | engagement 점수 | 중 | Free 수동 + Premium AI |
| 4 | 학생 입학 출처 | 마케팅 ROI | 낮 | Free 입력 + Premium 분석 |
| 5 | 성적 / 평가 | 학업 quality | 중 | Free 기본 + Premium 분석 |
| 6 | 수업 노트 | AI 학습 데이터 | 중 | Premium AI 요약 |
| 7 | 상담 기록 | 이탈 사전 신호 | 낮 | Premium CRM 통합 |
| 8 | 지역 / 학교 정보 | B2B 리포트 핵심 | 낮 | Free 입력 |
| 9 | 학원 마케팅 도구 | 채널 효과 측정 | 높 | Premium + 마켓 수수료 |
| 10 | 강사 마켓플레이스 | D. 마켓 수익 | 높 (별도 product) | Phase 4+ |

**도입 phase**:
- **Phase 2** (3-6개월): rank 1, 4, 8 (출결 UI 강화 + 입학 출처 + 지역)
- **Phase 3** (6-12개월): rank 2, 3, 5 (수업료 + 학부모 + 성적)
- **Phase 4+** (12개월+): rank 9, 10 (마케팅 + 강사 마켓)

## 5. Future Product Lines

```
Core (현재)  →  Insights (Premium)  →  Pay (결제+수수료)  →  Market (B2B 리포트)  →  Match (B2C 마켓플레이스)
Phase 1-2       Phase 2-3              Phase 3              Phase 4+              Phase 4+
```

| Product | Phase | 설명 |
|---|---|---|
| class-planner Core | 1-2 | 시간표 + 학생 + 강사 (무료/Premium) |
| class-planner Insights | 2-3 | KPI 대시보드 + AI 자동화 (Premium feature) |
| class-planner Pay | 3 | 학원비 결제 + 자동 청구 (Free + 수수료) |
| class-planner Market | 4+ | 시장 리포트 + 데이터 API (B2B 별도) |
| class-planner Match | 4+ | 강사 채용 매칭 + 학원 추천 (마켓) |
| class-planner Parents | 4+ | 학부모 앱 (자녀 학원 통합 view) |
| class-planner Students | 4+ | 학생 앱 (시간표 + self check-in + viral) |
| class-planner Find | 4+ | B2C 학원 검색·비교 마켓 |
| class-planner Tutor | 4+ | 1:1 개인 강사 (Wyzant/Preply 패턴) |

**로드맵 logic**: Core (대규모 무료 사용자) → Insights (데이터 누적 + Premium ARR) → Pay (거래 데이터 + 폭발적 수수료) → Market/Match/B2C (누적 데이터로 B2C 진입). 각 product 은 이전 데이터 위에 빌드 — 순서 바꾸면 데이터 부족으로 실패.

## 6. 수익화 모델 5 + B2C ARR

### B2B 만 (Phase 1-3)

| 모델 | ARR (학원 1000곳 기준) | Phase |
|---|---|---|
| Premium 구독 | 900만원/년 | 메인 |
| 결제 수수료 (게임 체인저) | 18억원/년 | Phase 3 |
| B2B 시장 리포트 | 2.5억원/년 | Phase 4 |
| 마켓플레이스 수수료 | 1억원/년 | Phase 4+ |
| API / Data | 1천만원/년 | Phase 5 |
| **합계** | **~22억원/년** | |

### B2C 확장 (Phase 4+, 학부모 5000명 가정)

| 채널 | ARR |
|---|---|
| Parents 결제 수수료 (학원비 1.5%) | 45억원/년 |
| Find 마켓 매칭 수수료 (5%) | 36억원/년 |
| Premium 학원 광고 슬롯 | 6천만원/년 |
| Tutor 수업 수수료 (10%) | 12억원/년 |
| **B2C 합계** | **~93억원/년** |

**총 ARR Phase 4+ 추정**: 약 115억원/년 (B2B 22억 + B2C 93억). B2C 가 진짜 unlock. 단 critical mass (학원 1000+) 가 우선.

## 7. 변경 이력

- 2026-05-24: 초안 (mockup §⑤c + §⑤d + §⑩ 동기)
