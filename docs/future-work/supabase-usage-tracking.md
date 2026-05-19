# Supabase 사용량 모니터링 + Phase 2 트리거 추적

> ADR-018 (`docs/adr/018-postgres-self-host-consideration.md`)의 Phase 2 재평가 준비. 트리거 조건 (DB 400MB / Egress 2GB / MAU 10K / Pro 비용 $25+) 도달 여부를 정량 추적.

## 측정 절차

### 1. Supabase Dashboard 수동 확인 (월 1회, 매월 1일)

[Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → **Settings → Usage**

기록 항목:
- **Database Size**: 현재 / 500 MB free limit
- **Egress**: 이번 달 누적 / 5 GB
- **Auth Users (MAU)**: 활성 사용자 수 / 50,000
- **Realtime concurrent peak**: 이번 달 최대 / 200
- **Storage**: 사용량 / 1 GB
- **Edge Function invocations**: 이번 달 / 500K

기록 위치: `docs/future-work/supabase-usage-log/YYYY-MM.md` (월별 누적, 시계열 보존)

### 2. 자동 측정 (Phase 2 진입 후 도입 — 현재 보류)

Supabase Management API 또는 metrics endpoint 활용:
- `scripts/supabase-usage-snapshot.ts` (가정) — admin API call → JSON → 일별 cron 적재
- launchd / GitHub Actions schedule 로 자동화

현재는 사용량 < 1% 라 자동화 ROI 낮음. **트리거 조건 1개 충족 시 자동화 도입**.

## Threshold 알람 (수동 체크)

각 측정 시 다음 기준으로 alert level 결정:

| Level | 조건 | 액션 |
|---|---|---|
| 🟢 OK | 모든 항목 < 50% | 다음 달 측정 진행 |
| 🟡 Warning | 1개 항목 ≥ 50% | 사용량 트렌드 분석. 6개월 ahead 예측. |
| 🟠 Alert | 1개 항목 ≥ 70% | ADR-018 Phase 2 재평가 시작. 트리거 조건 충족 검증. |
| 🔴 Action | 1개 항목 ≥ 85% 또는 Pro 비용 발생 | Phase 2 트리거 — self-host 마이그레이션 작업 착수 |

## ADR-018 Phase 2 트리거 매핑

본 모니터링의 직접 목적은 ADR-018 의 정량 트리거 조건 충족 시점 포착:

- [ ] **DB > 400 MB** (free tier 80%) — Database Size 측정
- [ ] **Egress > 2 GB/month** — Egress 측정 (CI E2E 비용 비중 추적)
- [ ] **MAU > 10,000** (free tier 20%) — Auth Users 측정
- [ ] **Supabase 월 비용 $25+** (Pro 강제) — Billing 측정

위 1개라도 도달 시 ADR-018 Phase 2 재평가 → self-host 결정 진입.

## CI E2E 비용 분리 추적 (선택)

전체 Egress 중 CI E2E (multi-academy.spec.ts, templates-apply-delete.spec.ts 등 ~12 spec) 차지 비중:
- 정성 추정: 매 PR push 시 ~200-500 KB. 월 5-10 push × 30 일 = 30-150 MB.
- 전체 Egress 중 차지: 0.6-3% (현재 free tier 기준)

별도 측정 어려움 (Supabase 는 source IP 분리 통계 제공 안 함). 대안:
- Supabase log 분석 (Service Role API 호출 빈도) — Management API 의 `/v1/projects/{ref}/api-keys/usage` 사용 가능 (Phase 2)

## 측정 로그 템플릿

`docs/future-work/supabase-usage-log/YYYY-MM.md`:

```markdown
# Supabase Usage — YYYY-MM

측정 일자: YYYY-MM-DD HH:MM (KST)
측정자: HYUNJIN

| 항목 | 사용량 | Free limit | % | Level |
|---|---|---|---|---|
| Database Size | XXX MB | 500 MB | XX% | 🟢/🟡/🟠/🔴 |
| Egress | X.X GB | 5 GB | XX% | ... |
| Auth Users (MAU) | XXX | 50,000 | XX% | ... |
| Realtime peak | X | 200 | XX% | ... |
| Storage | XX MB | 1 GB | XX% | ... |
| Edge Functions | XXK | 500K | XX% | ... |

## 트렌드 (이전 달 대비)
- Database Size: +XX MB (월 평균 성장률 XX%)
- Egress: ...
- MAU: ...

## Alert (있다면)
- 🟡 Warning: ...
- 액션: ...

## Phase 2 트리거 평가
- [ ] DB > 400 MB
- [ ] Egress > 2 GB/month
- [ ] MAU > 10,000
- [ ] Pro 비용 $25+

→ 모두 미달 / Phase 2 시작

## 다음 측정: YYYY-MM-DD
```

## 비용 시뮬레이션 갱신 주기

ADR-018 의 비용 시뮬레이션 표 (Free vs Pro vs self-host) 는 분기 1회 갱신. Supabase 요금 정책 변경 또는 사용자 수 변화 시 즉시.

## 관련
- ADR-018: postgres self-host 전환 고려
- ADR-001: Vercel → AWS Lightsail 마이그레이션 (DB 는 Supabase 유지 결정)
- `dev-pack/docs/local-compute-resources.md`: cloud SaaS vs self-host 정책
