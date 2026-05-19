# ADR-018: PostgreSQL Self-Host 전환 고려 (의식적 보류)

## 상태
**Proposed — 의식적 보류 (Deferred by design).** 트리거 조건 명시. ADR-001 의 "Self-hosted PostgreSQL/NextAuth 전환 기각" 결정을 보완 — 그 때는 "결합도 높음" 이라는 정성적 사유만 있었음. 본 ADR 은 정량 기준 + Mac Studio M3 Ultra 도착 (2026-05-07) 으로 변화된 인프라 상황 반영.

## 컨텍스트

### 현재 상태 (2026-05-19)
- **앱 서버**: AWS Lightsail 1GB (ap-northeast-2) — Docker + Nginx + Let's Encrypt (ADR-001)
- **DB + Auth**: Supabase (managed) — Postgres + OAuth (Google, Kakao) + RLS
- **사용자**: 1-5명 (학원 운영자, 초기 단계)
- **E2E**: 매 CI run 마다 real Supabase 호출 (multi-academy.spec.ts, templates-apply-delete.spec.ts 등 ~12 spec)
- **로컬 컴퓨트 자원**: MacBook + **Mac Studio M3 Ultra 512GB** (2026-05-07 도착)

### Supabase 사용량 추정 (2026-05-19 시점)
| 자원 | 추정 사용 | Free tier 한도 | 사용률 |
|---|---|---|---|
| DB 크기 | < 5 MB (학원 1-5개 데이터) | 500 MB | < 1% |
| Egress | ~15-30 MB/month (CI E2E 포함) | 5 GB | 0.3-0.6% |
| MAU | 1-5 | 50,000 | < 0.01% |
| Edge function | 0 (미사용) | 500K | 0% |

→ **무료 티어 충분**. Pro plan ($25/month) 전환 압력 없음.

### 비용 시뮬레이션 (성장 시나리오)
| 시나리오 | Supabase | Lightsail self-host | 비용 차이/month |
|---|---|---|---|
| 현재 (1-5 사용자) | Free $0 | Free (app server 동거) ~ $5/month (별도 instance) | -$5 |
| 50 학원 / 100 사용자 | Pro $25 | $15-20 (별도 instance) | +$5-10 |
| 500 학원 / 1000 사용자 | Pro+addon ~$100+ | $30-50 (스케일 instance) | +$50-70 |

### Mac Studio M3 Ultra 활용 가능성
- **로컬 dev**: Postgres docker로 로컬 환경 (현재도 가능)
- **prod**: 가정 인터넷 + 보안 부담. 실용성 낮음 (CDN/DDoS 보호 없음)
- **CI runner self-host**: GitHub Actions runner 호스팅 — E2E 속도 + 비용 절감 (별도 가치)

## 결정

**현재 (1-5 사용자 단계)**: Supabase 유지. self-host 전환 보류.

근거:
1. **비용 차이 미미** (-$5 ~ +$5/month, 운영 부담 고려 시 self-host 가 더 비쌈)
2. **Supabase auth + DB 결합도 높음** — 전환 시 OAuth (Google/Kakao) 핸들링 + RLS policy 재구성 큰 작업
3. **데이터 sovereignty / 커스텀 욕구**는 단기 ROI 낮음 — managed 서비스의 안정성 가치가 더 큼
4. **Mac Studio prod 운영은 비현실** — 가정 인프라 한계 (전력/네트워크/보안)

## 트리거 조건 (Phase 2 재평가)

다음 조건 **1개라도** 충족 시 self-host 전환 검토:

### 정량 트리거
- [ ] **Supabase 월 비용 $25+ (Pro plan 전환)** — free tier 초과로 Pro 강제 진입
- [ ] **DB > 400 MB** (free tier 500MB 80% 도달, ~50+ 학원)
- [ ] **MAU > 10,000** (free tier 20% 도달)
- [ ] **Egress > 2 GB/month** (E2E + 사용자 데이터 증가, free tier 40%)

### 정성 트리거
- [ ] **Custom PG extension 필요** (timescaledb, pgvector, postgis 등 — Supabase 미지원/유료 옵션)
- [ ] **데이터 sovereignty 요구** (B2B 계약, 개인정보 규제)
- [ ] **Supabase 장애가 사업 영향 발생** (3회 이상, 누적 4시간+ 다운타임)
- [ ] **RLS policy 한계 도달** — app-level access control 필요한 케이스 증가

## 마이그레이션 비용 (트리거 시 실제 작업량)

### 분리 가능 컴포넌트
1. **Auth (Supabase Auth → NextAuth)**: 1-2주
   - OAuth provider (Google/Kakao) 재등록
   - session 관리 + JWT 발급 로직 작성
   - 기존 user/academy_members FK 보존 (uid 보존 방식)
2. **DB (Supabase Postgres → Lightsail Postgres)**: 1-2주
   - Migration files 그대로 적용 (`supabase/migrations/`)
   - pg_dump / pg_restore 또는 logical replication
   - 백업 + 모니터링 (Backrest, pgwatch2 등)
3. **RLS policy 재검증**: 1주
   - Supabase RLS 는 그대로 PG row policy 로 호환 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
   - `auth.uid()` 함수만 custom session 함수로 교체
4. **운영 부담**: 지속
   - 패치 (Postgres 보안 업데이트)
   - 백업 자동화 + 복구 훈련
   - 모니터링 (디스크, 커넥션 풀, slow query)
   - 장애 대응 on-call

총 **3-5주 일정 작업** + **장기 운영 부담** 추가.

## 대안

### A. Supabase Pro plan
- 비용: $25/month + addon
- 운영 부담: 0
- 장점: 비용 작은 단계 (50-500 학원) 최적
- 단점: 외부 서비스 의존 지속

### B. Lightsail 별도 PG instance ($15-20/month)
- 별도 1GB Lightsail instance + PG 13/14 설치
- 백업: Lightsail snapshot 일 1회 + s3 export
- 장점: 비용 절감 (Pro+addon 대비)
- 단점: 운영 부담 (혼자)

### C. Lightsail app server 에 PG 동거
- 기존 1GB instance 안 PG 동거
- 비용 추가 $0
- 장점: 비용 0
- 단점: 메모리 충돌, 장애 시 app + DB 동시 다운, 백업 복잡
- → **권장 X** (안정성 손해)

### D. Mac Studio prod (rejected)
- 가정 인프라 한계 — 비현실

## 결과 (현재 결정 유지 시)

### 긍정
- 운영 부담 0
- 무료 티어 사용 (비용 0)
- Supabase realtime, edge function 등 부가 기능 활용 가능
- Auth/RLS 통합 — 작은 코드베이스 유지

### 부정 (잠재)
- 외부 서비스 의존 — 장애 시 영향
- 커스텀 제한 (특정 PG extension 미지원)
- 비용 증가 시 곡선 가파름 (Pro 진입 후 addon 비용 누적)
- 데이터 sovereignty 가치 미달성

## 관련 ADR
- ADR-001: Vercel → AWS Lightsail 마이그레이션 (앱 서버만 self-host, DB 는 Supabase 유지)
- ADR-002: JSONB → 정규화 마이그레이션 (Supabase 안에서 진행 중)
- ADR-011: Supabase migration versioning + apply discipline

## 모니터링 (Phase 2 평가 도구)

다음 주기적 측정:
1. **월 1회**: Supabase dashboard 의 사용량 보고 → free tier % 추적
2. **분기 1회**: 위 트리거 조건 점검 + 본 ADR 갱신
3. **연 1회**: 전체 비용 + 운영 부담 평가 → 의식적 결정 갱신

`docs/future-work/supabase-usage-tracking.md` (별도 작성 — 측정 절차 + threshold 알람) 가치 있음.

## 참고
- 사용자 의도: "Supabase 무료 티어 부담 우려 + 자기 컨트롤 영역 확대" (2026-05-19 대화)
- Mac Studio M3 Ultra 도착: 2026-05-07 — 로컬 dev 인프라 확대
- `dev-pack/docs/local-compute-resources.md`: cloud SaaS vs self-host 비교 정책 (모든 권장안에 둘 다 제시 의무)
