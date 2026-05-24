# class-planner — Monetization 전략 (SSOT)

> 본 문서는 class-planner 의 freemium 전략 + Phase Timeline + 광고/프리미엄 결정의 SSOT.
> 시각 mockup: `/design-explorations/monetization-strategy` (Next.js 라우트).
> 결정 배경: `docs/adr/014-monetization-freemium-strategy.md`.

## 1. 핵심 결정 (한 줄)

**"무료로 풀어 유저 확보 → Usage + 협업 + 안전망 3-trigger 부분유료화"**

- Phase 1 (0~3개월): 100% 무료, 친구 (학원 운영자 첫 user) 선공개 + 피드백
- Phase 2 (3~6개월): Premium 출시 (월 14,900원/학원, annual 12,900원)
- Phase 3 (6~12개월): 결제 통합 + 데이터 분석 + AI 자동화
- Phase 4+ (12개월+): B2C 확장 (학부모/학생 + 마켓플레이스)

## 2. 시장 배경

| 항목 | 수치 |
|---|---|
| 2024 한국 사교육비 | 29.2조원 (2020 대비 +50%) |
| 2025 예상 | ~32조원 |
| 학생 1인당 사교육비 | 567만원 |
| 서울 사교육 참여율 | 86.1% |

학원 시장 양극화·디지털 전환 가속. 학원 관리 SaaS 경쟁자 다수 — 무료(클래스업/공선학관/랠리즈) + 유료(학원조아/통통통/에듀허브). 시간표 중심 솔루션은 빈틈.

## 3. Freemium tier — 안 B (채택)

### 3.1 Free

- 학생 30명까지
- 본인 (원장) 1명 (다른 강사·관리자 초대 불가)
- 시간표 + 학생 + 강사 + 과목 + PDF + 학부모 share — 풀 기능
- 강사 휴지통 30일 (이후 영구 삭제 알림)
- 자동 백업 최근 1개 + 7일 유지

### 3.2 Premium — 월 14,900원 / annual 12,900원

- 학생 무제한
- 강사·관리자 초대 무제한 (협업)
- AI 시간표 최적화 + 학생 picker
- 학원별 분석 대시보드
- PDF 워터마크 제거 + 학원 로고 upload
- 강사 휴지통 무제한 + 보관 audit log + 일괄 복구
- 데이터 복구 — 자동 백업 90일 + 수동 스냅샷 + 시점 복원 + JSON 다운로드

### 3.3 변환율 / ARR 추정

- 변환율 6-10% (small biz SaaS 표준)
- 학원 1000곳 × 5% × 14,900원 = 75만원/월 = ARR 900만원
- Phase 3 결제 통합 후: ARR 18억원 (학원비 1억원/월 × 1.5% × 1000곳)

## 4. Phase Timeline (정식)

### Phase 1 — 0~3개월 — 사용자 확보

- 100% 무료. 친구 (학원 운영자 + 와이프) 선공개
- 코어 기능: 시간표 / 학생 / 강사 / 출결 / PDF / share — 이미 구현
- **부족 (Top 3 우선)**:
  1. In-app 피드백 채널 (Sidebar 하단 버튼 → Supabase)
  2. 랜딩 (/about) 보강 — 현재 placeholder
  3. Analytics (Plausible 또는 Vercel — anonymous, GDPR-safe)
- KPI: WAU 100+ 학원, NPS 50+

### Phase 2 — 3~6개월 — Premium 정의 + 시드 유료

- Premium feature 1차: AI 시간표 자동 최적화
- Premium feature 2차: 강사 무제한 + 권한 세분
- 데이터 복구 UI 구현 (Free 7일 / Premium 90일)
- 강사 휴지통 한도 (Free 30일 / Premium 무제한)
- PDF brand 제거 (학원 logo upload)
- Stripe 또는 토스페이먼츠 결제 통합
- Phase 1 사용자에게 "6개월 무료 grandfather"
- KPI: 유료 학원 10+, 변환율 3-5%

### Phase 3 — 6~12개월 — 차별화 + Network 효과

- 학원별 분석 대시보드 (출결률, retention, 매출 추세)
- 학원 간 벤치마킹 (anonymized)
- 학부모 알림 자동화 (출결 자동 발송, AI 메시지 생성)
- **결제 통합 (PG 계약 + 학원비 자동 청구) — 수수료 1.5% — 게임 체인저**
- 데이터 복구 — 수동 스냅샷 + 다운로드 + audit log
- 강사 보관 audit log + 일괄 복구
- iOS/Android 앱 — push 알림
- KPI: 유료 학원 100+, ARR 1억원+, churn < 5%

### Phase 4+ — 12개월+ — B2C 확장 (학부모/학생 + 마켓플레이스)

- **class-planner Parents** (앱) — 자녀 학원 통합 view + 결제 + 상담
- **class-planner Students** (앱) — 본인 시간표 + 출결 self check-in + 친구 추천 viral
- **class-planner Find** (마켓플레이스) — 학부모가 학원 검색/비교/리뷰
- **class-planner Tutor** — 1:1 개인 강사 (Wyzant/Preply 패턴)
- ARR 추정: 학원 1000곳 + 학부모 5000명 = +73억원/년 (B2C 만)

## 5. 광고 vs 프리미엄

| 채널 | 적합도 | 사유 |
|---|---|---|
| 광고 | 비추천 | B2B SaaS 광고 효과 낮음. 학부모 share 페이지에 광고 = 학원 신뢰 손상 |
| Premium 구독 | 추천 | ARPU 14,900원 — small biz SaaS 표준. 학원 운영자 지불 의지 높음 |
| 결제 수수료 | Phase 3 부터 | 매출 발생 후 수수료 — 진입장벽 0 |

광고는 **partnership** (교재·보험·마케팅 도구) 형태로 cross-promotion 만 추후 검토.

## 6. AI 시대 차별화 moat

기능 moat 소멸 — AI 가 모든 기본 기능 복제. 남은 moat:

1. **데이터 flywheel** — 학원별 시간표·출결 데이터가 사용으로 누적. AI 추천 품질 ↑
2. **네트워크 효과** — 학부모·강사 한번 등록되면 학원이 옮기기 어려움
3. **브랜드/신뢰** — 학원 데이터 위탁 신뢰 형성. 시간 누적 필요
4. **실행 속도** — 사용자 피드백 → 24h 안 반영. vertical SaaS 의 진짜 우위
5. **워크플로우 통합** — 시간표 → 출결 → 수납 → 알림 → 성적 한 곳

→ class-planner 가 vertical SaaS 로서 AI-native upstart 의 80% 가격 침공도 데이터 우위로 방어 가능.

## 7. References

- 시장: [edumorning.com 사교육 30조](https://edumorning.com/articles/853), [아시아경제 사교육 30조](https://www.asiae.co.kr/visual-news/article/2025052914314444471)
- 경쟁: [학원 관리 8종 비교](https://blog.bati.ai/academy-service/)
- Freemium: [First Page Sage 2026 변환율](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
- AI moat: [Medium - AI killed the Feature Moat](https://medium.com/@cenrunzhe/ai-killed-the-feature-moat-heres-what-actually-defends-your-saas-company-in-2026-9a5d3d20973b)
- Vertical SaaS: [Stripe Sessions 2026](https://stripe.com/blog/vertical-saas-insights-sessions-2026)

## 8. 변경 이력

- 2026-05-24: 초안 (mockup `/design-explorations/monetization-strategy` 동기)
