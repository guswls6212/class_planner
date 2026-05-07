# Onboarding Guard — Server-side 마이그레이션 트리거 & 단계별 옵션

**작성일:** 2026-05-07
**현재 상태:** Client-side guard (옵션 B) 채택. middleware는 cookie만 검증, page mount 시 1회 academy 확인 + redirect.
**관련 PR/세션:** 진단 세션 2026-05-07 (이 문서가 그 결과물)

## 배경

신규 사용자가 OAuth 로그인 직후 `/schedule`에 도달했으나 academy 매핑이 없어 모든 API가 500을 반환하는 사고 발생 (radar 로그 2026-05-07T08:40:04Z 참조). 진짜 root cause 4개 식별됨:

1. **middleware의 onboarded 쿠키 단일 검증** — 명시적 로그아웃 없이 계정 전환 시 이전 쿠키 잔존
2. **anon→user 자동 마이그레이션 silent fail** — academy 부재 시 500 폭주
3. **Sidebar loading-vs-empty 미분리** — 빈 학원 배열도 "불러오는 중..." 표시
4. **비로그인에 학원 switcher 노출** — anonymous 모드에 무의미

**Bug 1 해소 방식 — 두 옵션:**

| 옵션 | 가드 방식 | 채택 |
|---|---|---|
| **B (client-side)** | middleware는 cookie만, page mount 시 `/api/onboarding/status` 1회 fetch + redirect | **현재 채택** |
| **A (server-side)** | middleware에서 매번 또는 첫 진입 시 DB 검증 + signed cookie 캐시 | **본 문서 — 향후 트리거 시 마이그레이션** |

옵션 B 채택 이유 (2026-05-07 결정):
- 현재 사용자 5명 baseline, 옵션 A의 인프라 비용 정합성 ↓
- 코드 변경 작음 (Level 2), 기존 `/api/onboarding/status` 재사용
- middleware 추가 latency 0 — 모든 페이지 영향 X
- Bug 2 같이 수정하면 flash race 조건 막을 수 있음

옵션 B의 알려진 한계 (옵션 A 트리거 근거):
- Mount 후 200~300ms 동안 schedule frame flash 가능
- middleware가 SSOT(academy_member 테이블) 검증 X — 보안 경계 약함
- guard 누락 가능성: 새 보호 페이지 추가 시 page-level guard 빠뜨릴 수 있음

## 도입 트리거 (하나라도 켜지면 검토)

| # | 트리거 | 임계치 | 왜 그때 필요한가 |
|---|---|---|---|
| 1 | **MAU 증가** | **월 활성 사용자 100명 이상** | 현재 5명 → 100명 = 20× 증가. cookie 잔존 케이스 빈도도 비례 증가 → 사용자별 1회 사고만 발생해도 신뢰 손상 |
| 2 | 쿠키 위변조/잔존 사고 | 분기당 1건 이상 보고됨 | "데이터 사라짐" 사고는 paid user 이탈 직결. server-side 검증으로 원천 차단 필요 |
| 3 | 보호 라우트 수 증가 | GUARDED_PATHS가 **8개 이상** | page-level guard 누락 가능성 ↑. middleware 단일 진실로 통합 가치 ↑ |
| 4 | 결제/유료 진입 | freemium → 유료 plan 도입 | 결제 사용자 데이터 보호 강화 의무. flash race 조건은 paid context에 불용 |
| 5 | 다중 academy 권한 변경 빈도 ↑ | 사용자 평균 academy 1+ 또는 권한 전환 빈번 | client-side 캐시가 stale 되기 쉬움. server-side 검증이 정합성 유리 |
| 6 | SSR 의존 페이지 추가 | 비-app-router SSR 또는 외부 봇 접근 허용 | client JS에 의존하는 page guard는 무력. middleware 단계 검증 필요 |

**Claude의 알림 의무:**

본 트리거가 켜진 신호를 인지한 시점에 사용자에게 자발적으로 알린다. 구체적 인지 신호:
- 사용자 발화: "사용자 X명 됐어", "ICP 검증 끝났어", "유료 plan 시작할까"
- 코드/시스템 변화: GUARDED_PATHS 확장 PR, 결제 흐름 도입 PR
- 사고 보고: "데이터 사라졌다는 사용자 메시지 받음"

이 중 하나 인지 시 **즉시 본 문서를 사용자에게 환기**하고 마이그레이션 plan 작성 제안.

## 단계별 도입 옵션

### Stage 0 — 현재 (옵션 B)
- middleware: cookie `onboarded=1`만 확인
- page-level: AppShell mount 시 `/api/onboarding/status` 1회
- Bug 2 수정 포함: academy 없으면 마이그레이션 X

### Stage 1 — middleware에 Supabase 검증 + JWT parse (트리거 1~2개 발동 시)
**목적:** server-side에서 academy_member 매핑 확인
**구현:**
- middleware에서 `sb-*-auth-token` 쿠키 → JWT decode → user_id 추출
- Supabase service role client로 `academy_members` 1 row select
- 매 request마다 query — Lightsail single instance + Supabase 같은 region이므로 RTT ~10-30ms

**비용:**
- DB query: request마다 1회. 100명 × 50 PV/day = 5,000 query/day = 150K query/month
- Supabase free tier query 제한 무 (단 connection pool 60)
- middleware bundle size 증가 (Supabase JS client + JWT parse)
- 구현 ~6시간

**한계:**
- 매 request DB go → cold path 30ms 추가 (모든 page)
- connection pool 압박 가능성 (1000명+ 시점)

### Stage 2 — Stage 1 + Signed cookie 캐시 (트리거 3+개 또는 결제 도입 시)
**목적:** 첫 검증 후 결과를 signed cookie에 저장 → 이후 cookie hit으로 DB 조회 0
**구현:**
- 첫 진입 시 academy_id를 HMAC-SHA256 서명한 cookie로 set (TTL 1시간 권장)
- middleware는 cookie 서명 검증 → valid 면 통과, invalid/expired 면 DB 재검증
- academy 변경 시 cookie 무효화 흐름 (예: invite accept, member remove API에서 cookie 삭제)

**비용:**
- DB query: 사용자당 1시간에 1회 = 100명 × 24회/day = 2,400 query/day = 72K query/month
- 새 환경변수: `COOKIE_SIGNING_SECRET` (32바이트 random, 6개월마다 회전)
- ADR 작성 의무 (캐시 TTL, 무효화 정책, secret 회전 절차)
- 구현 ~10시간

**Mac Studio M3 Ultra 활용:**
- secret 회전 자동화 스크립트 — Mac Studio cron으로 6개월마다 새 secret 생성 + Lightsail 환경변수 push
- 마이그레이션 검증 e2e — Mac Studio 병렬 실행 (cookie 만료/위변조/계정 전환 시나리오)
- self-host monitoring — Lightsail 로그 + Mac Studio Grafana로 cookie 검증 실패율 추적

### Stage 3 — Edge KV 또는 Redis 캐시 (1000명+ 또는 multi-region 진입 시)
**목적:** signed cookie의 한계(브라우저 단위 격리) 극복 — 사용자가 여러 device에서 접근 시에도 단일 캐시
**비용:**
- Cloudflare Workers KV ($0.50/M reads) 또는 Upstash Redis (free tier 10K req/day)
- Mac Studio self-host Redis 가능 — Lightsail에서 outbound로 접근 (Tailscale or 정적 IP)
- 구현 ~15시간 + 인프라 셋업

**Mac Studio 활용 가치 ↑:**
- 512GB RAM의 Redis instance를 self-host → cloud Redis 비용 0
- multi-region 시점이 와도 Mac Studio가 ap-northeast-2 백엔드 캐시로 충분 (latency 5-10ms)

## 비용 비교 (월 환산, 사용자 규모별)

| 사용자 | Stage 0 (현재) | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|
| 5명 | $0 | $0 | $0 | 과함 |
| 100명 | $0 (flash 위험) | $0 | $0 | 과함 |
| 1,000명 | flash + connection pool 한계 | $0 (Supabase Pro $25/mo 검토) | $0 | $5-10/mo (cloud Redis) 또는 Mac Studio self-host $0 |
| 10,000명 | 부적합 | Pro tier 필수 ($25/mo) | Pro tier ($25/mo) | self-host Mac Studio 강력 추천 |

**현재 ICP 검증(0-30명) 단계에서는 Stage 0 정합.** 30-100명 phase 2 (paid 검증)에서 Stage 1 검토 시점. 100명 돌파 시 Stage 2 ADR 작성.

## 트리거 점검 명령어

```bash
# 1. MAU 추정 (Supabase auth.users)
# Supabase Dashboard에서 매월 1일 기준 last_sign_in_at 30일 내 user count

# 2. GUARDED_PATHS 수
grep -E "^const GUARDED_PATHS" src/middleware.ts | tr ',' '\n' | wc -l

# 3. 결제/유료 흐름 코드 존재
find src -path '*payment*' -o -path '*billing*' -o -path '*subscription*' | wc -l

# 4. 사고 보고 (radar 로그 academy 부재 에러)
grep -c "온보딩이 완료되지 않은" omni-radar/logs/radar_*.jsonl
```

## 액션 아이템 (현재)

- [x] Stage 0 옵션 B 채택 + Bug 2 수정 (이번 세션, 2026-05-07)
- [ ] **분기당 1회 트리거 점검** — MAU, 사고 보고 빈도
- [ ] 트리거 1+개 발동 시 Stage 1 ADR 작성
- [ ] Stage 2 도입 시 `COOKIE_SIGNING_SECRET` 환경변수 + 회전 절차 ADR

## 관련 문서

- 본 세션 진단 결과 (2026-05-07 학습 일지)
- `src/middleware.ts` — 현재 cookie-only guard
- `src/app/api/onboarding/status/route.ts` — academy 매핑 확인 API
- `docs/local-compute-resources.md` (workspace root) — Mac Studio 활용 정책
- 수익화 3-phase (학습일지 2026-05-06) — Phase 1 (0-30) / 2 (30-100) / 3 (100+) 임계치
