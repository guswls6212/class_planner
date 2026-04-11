# ADR-001: Vercel → AWS Lightsail 마이그레이션 (하이브리드)

## 상태
Accepted (2026-04-10) — 하이브리드 전략으로 확정. Phase 1 배포 완료.

> 최초 Proposed (2026-04-09)에서는 Self-hosted PostgreSQL + Auth 전환을 계획했으나,
> 인프라 제약과 Supabase SDK 결합도 분석 후 하이브리드로 변경.

## 컨텍스트
class-planner는 Vercel (프론트엔드/API) + Supabase (PostgreSQL + Auth)로 배포 중이었다.

현재 문제점:
- Vercel/Supabase 무료 티어 제한 → 유료 전환 시 비용 발생
- 로그 관리 및 모니터링이 제한적 (Vercel 로그 보존 짧음, Supabase 로그 접근 제한)
- JSONB 단일 테이블 구조 → 쿼리 성능 및 데이터 무결성 한계
- Supabase Auth에 종속 → 커스터마이징 제약

마이그레이션 동기:
- HYUNJIN이 AWS Lightsail 인스턴스를 이미 보유하고 있음
- 개발자 9년차로 직접 배포/관리 가능
- Docker 도입으로 환경 일관성 확보
- 자체 호스팅 시 로깅, 모니터링, 디버깅 완전 제어
- omni-radar 연동 가능성 확보

## 결정
**하이브리드 전략**: 앱 서버만 Lightsail로 이전, Supabase는 Auth + DB로 유지.

### 구체적 변경사항
1. **배포:** Vercel → Docker (Next.js standalone) + Lightsail 1GB 인스턴스
2. **리버스 프록시:** Nginx + Let's Encrypt SSL
3. **데이터베이스:** Supabase PostgreSQL 유지 (JSONB → 정규화는 Phase 3에서 별도 진행)
4. **인증:** Supabase Auth 유지 (SDK 결합도 9/10, 전환 비용 대비 이득 낮음)
5. **도메인:** class-planner.info365.studio 유지 (DNS A 레코드만 Lightsail IP로 변경)

### 하이브리드를 선택한 이유
- **RAM 제약:** Lightsail 1GB 인스턴스에 Next.js + PostgreSQL을 동시에 올리면 OOM 위험
- **Auth 결합도:** AuthContext, LoginButton, AuthGuard 등에서 Supabase SDK 직접 호출 (9/10). 전환하면 인증 관련 코드 전면 재작성 필요
- **DB 결합도:** Repository 구현체가 Supabase SDK에 결합 (7/10). 추상화는 Phase 3에서 점진적으로 진행 가능
- **비용:** Lightsail $7/월 + Supabase Free tier = 최소 비용으로 운영 가능

### 기각된 대안
- **Full Self-hosted (PostgreSQL + Auth 포함):** 1GB RAM 부족 + Auth 전환 작업량 과다. Phase 3 이후 인스턴스 업그레이드 시 재검토
- **Vercel 유지 + Supabase만 교체:** Vercel 로깅 제한 미해결. 인프라 제어권 확보 목적에 부합하지 않음
- **AWS ECS/Fargate:** 소규모 프로젝트에 과도한 복잡성. Lightsail의 단순함이 유지보수에 유리

## 결과
### 장점
- 완전한 앱 서버 제어 (로그, 모니터링, Docker)
- 비용 예측 가능 (Lightsail $7/월 고정 + Supabase 무료)
- Supabase Auth/DB 전환 없이 빠른 마이그레이션 달성
- omni-radar 연동 가능 (ASGI 미들웨어)
- Phase 3에서 점진적 Supabase 탈피 가능 (Repository 추상화)

### 단점
- Supabase 의존성 잔존 (Auth 9/10, DB 7/10)
- Supabase 서비스 장애 시 앱 전체 영향
- 로컬과 프로덕션 간 환경변수 이중 관리 필요 (.env.local, .env.production)

### 리스크
- Supabase Free tier 한도 초과 시 유료 전환 또는 DB 마이그레이션 필요
- SSL 인증서 자동 갱신 실패 시 사이트 접속 불가 (90일 주기 모니터링 필요)
- 1GB RAM + 2GB swap으로 빌드 가능하나, 트래픽 증가 시 인스턴스 업그레이드 필요
