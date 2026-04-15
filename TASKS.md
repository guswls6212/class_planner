# Class Planner — Tasks

## Phase 0: dev-pack 온보딩 ✅
- [x] dev-pack으로 프로젝트 이동
- [x] CLAUDE.md 작성
- [x] ARCHITECTURE.md 작성
- [x] TASKS.md 작성
- [x] tree.txt 생성
- [x] docs/adr/ 디렉터리 구조 세팅
- [x] projects.md에 등록
- [x] 루트 CLAUDE.md Scope 업데이트

## Phase 1: 인프라 마이그레이션 ✅
> Vercel → AWS Lightsail (하이브리드: Supabase Auth + DB 유지)
>
> **전략:** Supabase는 Auth + DB로 유지 (무료 티어), Lightsail은 앱 서버만 담당.
> Self-hosted PostgreSQL + NextAuth.js 전환 계획은 폐기.
> 상세: `docs/adr/001-migrate-to-aws-lightsail.md`

### 1-A. 인프라 구축 ✅
- [x] Lightsail 인스턴스 생성 (class-planner-server, 1GB RAM, ap-northeast-2)
- [x] 고정 IP 할당 (13.209.250.174)
- [x] 방화벽 포트 개방 (22, 80, 443)
- [x] SSH config 설정 (Host class-planner)
- [x] DNS A 레코드 등록 (class-planner.info365.studio → 13.209.250.174)

### 1-B. Docker 설정 ✅
- [x] Dockerfile (멀티스테이지: base → builder → runner)
- [x] docker-compose.yml (3 서비스: app, nginx, certbot)
- [x] .dockerignore
- [x] next.config.ts에 `output: "standalone"` 추가

### 1-C. 배포 자동화 ✅
- [x] scripts/setup-server.sh (Docker, Compose, Git 설치)
- [x] scripts/deploy.sh (빌드 → HTTP기동 → SSL발급 → HTTPS전환)
- [x] Nginx 설정 (init-ssl.conf, default.conf)
- [x] Swap 2GB 추가 (1GB RAM OOM 방지)

### 1-D. SSL + 도메인 ✅
- [x] Let's Encrypt SSL 인증서 발급 (만료: 2026-07-09)
- [x] HTTPS 리다이렉트 설정
- [x] certbot 자동 갱신 (12시간 주기)
- [x] https://class-planner.info365.studio 접속 확인

### 1-E. 환경변수 + Supabase ✅
- [x] 새 Supabase 프로젝트 생성 (iqzcnyujkagwgshbecpg)
- [x] .env.production 작성 (서버용)
- [x] .env → .env.production 심볼릭 링크 (docker compose 빌드 args용)

### 1-F. 문서화 ✅
- [x] docs/deployment-guide.md 작성 (전체 배포 절차 + 명령어 설명)
- [x] docs/adr/001 작성

### 1-G. 마무리 ✅
- [x] .env.local 업데이트 (kcyqftasdxtqslrhbctv → iqzcnyujkagwgshbecpg)
- [x] deploy.sh certbot 버그 수정 (`--entrypoint ""` 추가)
- [x] Supabase OAuth callback URL 확인/업데이트 (Vercel→Lightsail 도메인 변경 반영)
- [x] 배포된 사이트 기능 검증 (로그인, 데이터 조회/저장, 시간표 CRUD)
- [x] CI/CD 구축 (GitHub Actions → Lightsail deploy) — deploy.yml, ghcr.io 이미지 태그, SHA 기반 롤백 (2026-04-12)

## Phase 2A: Academy 데이터 모델 + DB 정규화 (진행 중)
> 사용자가 늘어날 것을 대비해 처음부터 academy_id 기반으로 설계.
> JSONB 단일 테이블 → 정규화 테이블 마이그레이션을 academy 구조와 함께 진행.

### 2A-1: SQL 마이그레이션 (단계 1) ✅ 완료 (2026-04-11)
- [x] Academy 데이터 모델 설계: `academies`, `academy_members`, `students`, `subjects`, `enrollments`, `sessions`, `session_enrollments`
- [x] Supabase 마이그레이션 스크립트 작성 (016/017/018)
- [x] 기존 JSONB 데이터 → 정규화 테이블 마이그레이션 (5명 사용자 완료, 기존 UUID 유지)
- [x] RLS 정책 재설계 (academy_id 기반, 무한재귀 방지)
- [x] user_data 백업 (`migration/backups/user_data_20260411-2300.json`)

### 2A-2: Repository → API → Client 순차 마이그레이션

| # | 서브 프로젝트 | 상태 |
|---|-------------|------|
| **S1** | Repository 교체 (JSONB → 정규화 테이블, academy_id 파라미터) | ✅ 완료 (2026-04-12) |
| **S2** | API Route 재작성 (academy_id 기반 Repository 사용, `/api/data` 폐기) | ✅ 완료 (2026-04-12) |
| **S3** | 클라이언트 데이터 플로우 전환 (localStorage JSONB → 개별 API 호출) | ✅ 완료 (2026-04-12) |
| **S4** | 온보딩 플로우 (첫 로그인 → 학원 생성 → owner 부여) | ✅ 완료 (2026-04-12) |
| **S5** | 레거시 정리 (debouncedServerSync, /api/data, DataApplicationService 제거) | ✅ 완료 (2026-04-12) |

#### S1 완료 내역 (2026-04-12)
- `interfaces.ts`: `userId` → `academyId` 전체 변경
- `Student.ts`: gender 필드 추가
- `SupabaseStudentRepository`, `SupabaseSubjectRepository`: 정규화 테이블 직접 쿼리
- `SupabaseSessionRepository` (신규): sessions + session_enrollments 조인
- `SupabaseEnrollmentRepository` (신규): enrollments 테이블 CRUD
- Application Services: userId → academyId 파라미터 리네임
- SessionRepositoryFactory, EnrollmentRepositoryFactory: Mock → Supabase 구현체

#### S2 완료 내역 (2026-04-12)
- `src/lib/supabaseServiceRole.ts`: createServiceRoleClient 중복 추출 (4개 route→1곳)
- `src/lib/resolveAcademyId.ts`: userId → academyId 변환 유틸리티 (academy_members 조회)
- 모든 API Routes (students, subjects, sessions): userId → resolveAcademyId(userId) 적용
- subjects GET: user_data JSONB 직접 쿼리 → SubjectService.getAllSubjects 전환
- `/api/data`: @deprecated 주석 추가 (S5에서 제거 예정)
- TODO(S2) marker 전체 제거

#### S3 이후
- [x] 익명 우선 기능 (Anonymous-First) ✅ 완료 (2026-04-12)
  - 로그인 전 localStorage에 시간표 작성 가능
  - 로그인 시 자동 데이터 마이그레이션 (handleLoginDataMigration.ts)
  - 충돌 감지 및 사용자 선택 UI (DataConflictModal.tsx)
- [x] DataConflictModal UI/UX 개선 ✅ 완료 (2026-04-14, PR#15)
  - 라디오 + 확인 버튼 UX 분리
  - 학생/과목/수업 섹션 접기/펼치기
  - 그룹 수업 표시 개선 (학생 이름, 성별, 생년월일 표시)
  - CSS subgrid로 카드 높이 동기화
  - GET /api/sessions 403 버그 수정 (corsMiddleware 위치 오류)
  - fetch 에러 vs 빈 데이터 구분 (기본 과목 중복 생성 방지)
- [x] ARCHITECTURE.md 업데이트 ✅ 완료 (2026-04-14)
- [x] 온보딩 플로우 구현 (첫 로그인 → 학원명 입력 → 학원 자동 생성 → owner 부여) ✅ 완료 (2026-04-14, PR#20)
- [x] `syncSessionCreate` 시간 형식 버그 수정 (`HH:MM` → ISO 변환, 일반 UI 수업 추가 경로) ✅ 완료 (2026-04-14, PR#19)
- [x] 운영자 초대 기능 ✅ 완료 (2026-04-15, PR#22) — 초대 링크(1회용+7일만료), /settings 페이지, /invite/[token] 수락 페이지
- [x] `019_drop_user_data.sql` 적용 ✅ 완료 (2026-04-14) — user_data 테이블 + 전용 함수 제거, real-supabase.test.ts 삭제

## Phase 2B: 코드 품질 개선 (진행 중)
> Phase 2A 완료 후 진행. academy_id 기반 구조 위에서 코드 정리.
> 2026-04-14 감사 결과 기반으로 세부 태스크 구체화.

### 완료
- [x] 코딩 규칙 문서화 (`docs/code-convention.md` 신규, PR#17)
- [x] Dead code 제거: molecules/ScheduleHeader.tsx, auth route.test, useDebounce.test, useForm.test, page.tsx.backup (PR#17)
- [x] 고아 테스트 파일 삭제: FilterPanel, Pagination, SearchBox, Modal, Loading, Checkbox, scrollPositionManager, scrollPositionStorage, SubjectDomainService, SessionDomainService (PR#18)
- [x] 문서 구조화: UI_SPEC.md 신규 작성, ARCHITECTURE.md 현행화, 문서 archive (PR#16)
- [x] 문서 통합 축소: docs/ 9개 → 3개 (development-guide, deployment-guide, code-convention), 불일치 6건 수정
- [x] ARCHITECTURE.md §2.6 누락 디렉터리 추가 (src/middleware, src/shared, src/types, src/utils)
- [x] Infrastructure 테스트 커버리지 50% → 80% (factories, config, registry, index — 71 tests)
- [x] Lib 테스트 커버리지 60% → 80% (apiSync, authUtils, resolveAcademyId, supabaseServiceRole, timeUtils, yPositionMigration — 49 tests)
- [x] Schedule 컴포넌트/유틸 테스트 (_utils 5개 + _components 5개 — 56 tests)

### 남은 항목
- [x] 에러 핸들링 체계화 (F3 Step 1~4 완료, PR#25~28 → dev 머지 완료)
- [ ] 로깅/모니터링 — 자체 솔루션 (저장소: Supabase Postgres)
  - [x] Step 1: Docker 로그 rotation (max-size 10m, max-file 5) — PR#TBD
  - [ ] Step 2: `app_logs` 테이블 마이그레이션 (Supabase)
        — 컬럼: id, ts, level, source(server\|client), code, message, context jsonb, user_id, academy_id, request_id, user_agent, url, stack
        — RLS: insert는 service_role만, select는 owner role만
        — TTL: 30일 자동 삭제 함수 (선택)
  - [ ] Step 3: 서버 logger → app_logs 영구화
        — `logger.error/warn` 호출 시 service-role client로 비동기 insert (실패해도 stdout 유지)
        — `httpErrors.toErrorResponse`의 5xx 분기에서 자동 호출
        — PII 마스킹 (이메일/토큰/비밀번호 필드 redact)
  - [ ] Step 4: 클라이언트 에러 ingest 엔드포인트
        — `POST /api/logs/client` — rate-limit, payload schema 검증
        — `window.onerror` + `unhandledrejection` 글로벌 핸들러 (top-level client component)
        — `app/global-error.tsx` Next.js 글로벌 폴백
        — `ErrorBoundary` / `useUserTracking.trackError` → ingest 연동
  - [ ] Step 5: 관리자 로그 뷰어 `/settings/logs`
        — owner role만 접근 (academy_members 검증)
        — 최근 N건 조회, level/source/code 필터, 페이지네이션
  - [ ] Step 6: `console.*` 사용 금지 ESLint rule + 38개 sweep
        — `no-console` rule 추가 (logger.* 강제)
        — `src/` 전수 치환, 테스트 픽스처 제외
- [ ] 성능 최적화 (번들 사이즈, 초기 로딩)
- [ ] 접근성(a11y) 개선

## Phase 3: 디자인 리뉴얼 (계획)
> Phase 2B 안정화 후 진행.

- [ ] UI/UX 감사 (현재 디자인 문제점 정리)
- [ ] 디자인 시스템 정의 (색상, 타이포그래피, 간격)
- [ ] 랜딩 페이지 리디자인
- [ ] 시간표 그리드 UI 개선
- [ ] 학생/과목 관리 페이지 UI 개선
- [ ] 모바일 반응형 강화
- [ ] PDF 출력 레이아웃 개선

## Phase 4: 기능 확장 (계획)
- [ ] 학원생 자동 알림 (시간표 변경 시)
- [ ] 출석 관리 기능
- [ ] 월별/주별 시간표 뷰
- [ ] 시간표 템플릿 기능

---

## 실행 우선순위 가이드

| 우선순위 | 태스크 | 이유 |
|---------|--------|------|
| **P0** | 2B-2, 2B-3 | Dead code/깨진 링크 — CI 영향 가능, 빠른 수정 |
| **P1** | 2B-4 | ARCHITECTURE.md 완성 — AI 컨텍스트 품질 향상 |
| **P2** | 2B-5, 2B-6 | 테스트 커버리지 — 안정성 기반 |
| **P3** | 2B-7 | Schedule 테스트 — 가장 복잡한 페이지 안정화 |
| **P4** | 2B-8, 2B-9 | 리팩토링 — 코드 수정 시 점진적으로 병행 |
| **P5** | 2B-10 | 기타 품질 — 장기 과제 |

---

## 변경 이력
| 날짜 | 내용 |
|------|------|
| 2026-04-09 | Phase 0 완료, Phase 1 시작 |
| 2026-04-10 | Phase 1-A~F 완료 (인프라+Docker+SSL+배포+문서). 하이브리드 전략 확정 |
| 2026-04-10 | Phase 1-G 부분 완료: .env.local 업데이트, deploy.sh certbot 버그 수정 |
| 2026-04-11 | Phase 1-G 완료. Phase 순서 재편 (2↔3 스왑, 2A/2B 분리). Academy 멀티테넌트 구조 도입 결정 |
| 2026-04-12 | Phase 2A S1~S5 완료 (정규화 마이그레이션, Anonymous-First, 레거시 정리) |
| 2026-04-14 | PR#15 머지 (DataConflictModal 개선, sessions 403 수정, 기본과목 중복 방지). 문서 구조화 (UI_SPEC.md 신규, ARCHITECTURE.md 현행화, 문서 archive) |
| 2026-04-14 | PR#16 머지 (문서 구조화). PR#17 머지 (코딩 규칙 문서화, dead code 제거, 컨벤션 정비). PR#18 머지 (docs/ 9→3 통합 축소, 불일치 6건 수정, 고아 테스트 삭제) |
| 2026-04-14 | 019_drop_user_data.sql 적용 — 레거시 JSONB 테이블 제거, Phase 2A 정리 완료 (PR#21) |
| 2026-04-15 | PR#22 (운영자 초대 기능: invite_tokens, /settings, /invite/[token]) |
| 2026-04-15 | Phase 2B 에러 핸들링 완료(F3 PR#25~28). 로깅/모니터링 자체 솔루션 Step 1(Docker rotation) 시작, Step 2~6 TASKS.md 등록 |
