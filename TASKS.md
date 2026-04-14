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
- [ ] 온보딩 플로우 구현 (첫 로그인 → 학원명 입력 → 학원 자동 생성 → owner 부여)
- [ ] 운영자 초대 기능 (초대 링크 또는 이메일, academy_members INSERT/DELETE 정책 추가)
- [ ] `019_drop_user_data.sql` 적용 (Phase 2B에서 user_data 테이블 제거)
- [ ] `syncSessionCreate` 시간 형식 버그 수정 (`HH:MM` → ISO 변환, 일반 UI 수업 추가 경로)

## Phase 2B: 코드 품질 개선 (진행 중)
> Phase 2A 완료 후 진행. academy_id 기반 구조 위에서 코드 정리.
> 2026-04-14 감사 결과 기반으로 세부 태스크 구체화.

### 2B-1: Dead Code / 고아 파일 정리 ✅ (PR#17)
- [x] `src/components/molecules/ScheduleHeader.tsx` 삭제 (dead code, schedule/_components/ 버전만 사용)
- [x] `src/components/molecules/__tests__/ScheduleHeader.test.tsx` 삭제
- [x] `src/app/api/auth/__tests__/route.test.ts` 삭제 (auth route 삭제됨, 테스트만 잔존)
- [x] `src/hooks/__tests__/useDebounce.test.ts` 삭제 (hook 삭제됨)
- [x] `src/hooks/__tests__/useForm.test.ts` 삭제 (hook 삭제됨)
- [x] `src/app/schedule/page.tsx.backup` 삭제

### 2B-2: 추가 고아 테스트 파일 정리 ✅
> 감사에서 발견된 소스 없는 테스트 파일. SearchBox/FilterPanel/Pagination은 이미 삭제됨.
- [x] `src/components/atoms/__tests__/Modal.test.tsx` 삭제
- [x] `src/components/atoms/__tests__/Loading.test.tsx` 삭제
- [x] `src/components/atoms/__tests__/Checkbox.test.tsx` 삭제
- [x] `src/lib/__tests__/scrollPositionManager.test.ts` 삭제
- [x] `src/lib/__tests__/scrollPositionStorage.test.ts` 삭제
- [x] `src/domain/services/__tests__/SubjectDomainService.test.ts` 삭제
- [x] `src/domain/services/__tests__/SessionDomainService.test.ts` 삭제
- [x] `src/app/api/auth/` 빈 디렉터리 삭제

### 2B-3: 문서 깨진 링크 수정 ✅
> 활성 문서에서 `docs/archive/`로 이동된 파일을 가리키는 링크 제거/교체.
- [x] `docs/DEVELOPMENT_WORKFLOW.md` — PROJECT_STRUCTURE, LOGGING_GUIDE, SECURITY_GUIDE, README 링크 제거, code-convention/VERSION_MANAGEMENT로 교체
- [x] `docs/TESTING_STRATEGY.md` — PROJECT_STRUCTURE, README 링크 제거. Infrastructure 커버리지 상태 수정 (✅→⚠️ 50%)
- [x] `docs/TESTING_COMMANDS.md` — PROJECT_STRUCTURE 링크 제거, TESTING_STRATEGY/DEVELOPMENT_WORKFLOW로 교체

### 2B-4: ARCHITECTURE.md 완성도 보강 ✅
> §2.6에 누락된 src/ 하위 디렉터리 추가.
- [x] `src/middleware/` (cors.ts, logging.ts) 섹션 추가
- [x] `src/shared/` (constants/, types/) 섹션 추가
- [x] `src/types/` (scheduleTypes.ts) 섹션 추가 — shared/types로 점진 통합 예정 명시
- [x] `src/utils/` (supabaseClient.ts) 섹션 추가

### 2B-5: Infrastructure 테스트 커버리지 (50% → 80%) ✅
> factories 4개 + config + registry + index 테스트 추가. 71 tests all passing.
- [x] `infrastructure/factories/` 4개 팩토리 테스트 (env 분기 검증)
- [x] `infrastructure/config/RepositoryConfig.ts` 테스트 (create/test/dev/prod)
- [x] `infrastructure/container/RepositoryRegistry.ts` 테스트 (register/resolve/singleton/autoRegister)
- [x] `infrastructure/index.ts` 테스트 (re-export 검증)

### 2B-6: Lib 테스트 커버리지 보강 (60% → 80%) ✅
> 핵심 유틸리티 6개 파일 테스트 추가. 49 tests all passing.
- [x] `lib/apiSync.ts` 테스트 (16 tests: CRUD fire-and-forget, anonymous skip, error handling)
- [x] `lib/authUtils.ts` 테스트 (3 tests: session/token/error)
- [x] `lib/resolveAcademyId.ts` 테스트 (2 tests: success/not-found)
- [x] `lib/supabaseServiceRole.ts` 테스트 (3 tests: env/singleton/missing-env)
- [x] `lib/timeUtils.ts` 테스트 (11 tests: KST conversions, formatting)
- [x] `lib/yPositionMigration.ts` 테스트 (14 tests: pixel↔logical, migration)

### 2B-7: Schedule 컴포넌트/유틸 테스트 커버리지 ✅
> _utils 5개 + _components 5개 테스트 완료. 총 56 new tests.
- [x] `schedule/_components/EditSessionModal.tsx` 테스트 (12 tests: 렌더링, 학생태그, 과목, 시간에러, 버튼)
- [x] `schedule/_components/PdfDownloadSection.tsx` 테스트 (2 tests: prop 전달, 로딩 상태)
- [x] `schedule/_components/ScheduleGridSection.tsx` 테스트 (3 tests: 렌더링, prop 전달, ref)
- [x] `schedule/_components/ScheduleHeader.tsx` 테스트 (6 tests: 제목, 로딩, 에러, 학생 선택)
- [x] `schedule/_components/StudentPanelSection.tsx` 테스트 (2 tests: 렌더링, prop 전달)
- [x] `schedule/_utils/dndHelpers.ts` 테스트 (8 tests)
- [x] `schedule/_utils/collisionHelpers.ts` 테스트 (6 tests)
- [x] `schedule/_utils/collisionQueries.ts` 테스트 (8 tests)
- [x] `schedule/_utils/editSaveHandlers.ts` 테스트 (4 tests)
- [x] `schedule/_utils/modalHandlers.ts` 테스트 (7 tests)

### 2B-8: 대형 파일 분할 (300줄 초과)
> code-convention.md 기준. 기존 위반 파일 점진적 리팩토링.
- [ ] `schedule/page.tsx` (1032줄) — 섹션별 분리 (이미 _components 존재, 로직 추출 여지)
- [ ] `lib/localStorageCrud.ts` (1006줄) — CRUD 함수별 모듈 분리
- [ ] `lib/pdf-utils.ts` (995줄) — 생성/스타일/유틸 분리
- [ ] `organisms/TimeTableGrid.tsx` (563줄) — 렌더/이벤트/상태 분리
- [ ] `molecules/DataConflictModal.tsx` (476줄) — 섹션 컴포넌트 추출
- [ ] `hooks/useIntegratedDataLocal.ts` (452줄) — 도메인별 훅 분리
- [ ] `hooks/useScheduleSessionManagement.ts` (421줄)
- [ ] `hooks/useGlobalDataInitialization.ts` (412줄)
- [ ] `hooks/useScheduleDragAndDrop.ts` (393줄)
- [ ] `lib/auth/handleLoginDataMigration.ts` (371줄)
- [ ] `lib/auth/fullDataMigration.ts` (369줄)
- [ ] `organisms/StudentPanel.tsx` (340줄)
- [ ] `schedule/_components/EditSessionModal.tsx` (339줄)
- [ ] `lib/sessionCollisionUtils.ts` (332줄)
- [ ] `organisms/LoginButton.tsx` (325줄)
- [ ] `schedule/_components/GroupSessionModal.tsx` (318줄)
- [ ] `app/login/page.tsx` (309줄)

### 2B-9: 인라인 스타일 → Tailwind 마이그레이션
> code-convention.md: 신규 컴포넌트 Tailwind 전용. 기존 파일은 수정 시 점진 전환.
- [ ] `schedule/page.tsx` (~35건)
- [ ] `login/page.tsx` (~18건)
- [ ] `layout.tsx` (~10건)
- [ ] `molecules/SessionBlock.tsx`
- [ ] `molecules/TimeTableRow.tsx`
- [ ] `organisms/TimeTableGrid.tsx`
- [ ] `organisms/StudentPanel.tsx`
- [ ] `organisms/LoginButton.tsx`
- [ ] `atoms/ThemeToggle.tsx`
- [ ] 기타 인라인 스타일 포함 파일 (수정 시 점진 전환)

### 2B-10: 기타 코드 품질
- [ ] `syncSessionCreate` 시간 형식 통일 (apiSync.ts `HH:MM` → ISO, fullDataMigration.ts 일관성)
- [ ] 에러 핸들링 체계화
- [ ] 로깅/모니터링 연동 (omni-radar 또는 자체 솔루션)
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
| 2026-04-14 | PR#17 (convention refactor + cleanup). Phase 2B 세부 태스크 구체화 (감사 결과 기반 10개 서브태스크) |
