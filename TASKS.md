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
- [x] 에러 핸들링 체계화 (F3 Step 1~5 완료, PR#25~29 → dev 머지 완료)
- [ ] 로깅/모니터링 — 자체 솔루션 (저장소: Supabase Postgres)
  - [x] Step 1: Docker 로그 rotation (max-size 10m, max-file 5) — PR#58
  - [x] Step 2: `app_logs` 테이블 마이그레이션 (Supabase)
        — 컬럼: id, ts, level, source(server\|client), code, message, context jsonb, user_id, academy_id, request_id, user_agent, url, stack
        — RLS: insert는 service_role만, select는 owner role만
        — TTL: 30일 자동 삭제 함수 (선택)
  - [x] Step 3: 서버 logger → app_logs 영구화
        — `logger.error/warn` 호출 시 service-role client로 비동기 insert (실패해도 stdout 유지)
        — `httpErrors.toErrorResponse`의 5xx 분기에서 자동 호출 (이미 logger.error 호출 중 — 추가 변경 없음)
        — PII 마스킹 (이메일/토큰/비밀번호 필드 redact), maskPII 유틸 + 19개 단위 테스트
  - [x] Step 4: 클라이언트 에러 ingest 엔드포인트
        — `POST /api/logs/client` — in-memory rate-limit (30/min/IP, 60s window), payload schema 검증
        — `src/lib/rateLimit.ts` 신규 (IP별 토큰 버킷, Lightsail 단일 인스턴스 전제)
        — `logger.persistFromBrowser` — 브라우저에서 logger.error/warn 호출 시 fire-and-forget POST
        — `GlobalErrorHandlers.tsx` — window.onerror + unhandledrejection 글로벌 핸들러 (AppContent 마운트)
        — `app/global-error.tsx` — Next.js 글로벌 에러 폴백 (자체 html/body)
        — ErrorBoundary / useUserTracking.trackError → logger.error 경유로 자동 연동 (수정 없음)
        — 서버사이드 PII 마스킹 후 insert, UUID FK 보호
        — 5개 rateLimit + 9개 route + 2개 logger.browser 단위 테스트
  - [x] Step 5: 개발자 로그 뷰어 `/admin/logs`
        — ADMIN_EMAILS 화이트리스트 (env 기반 게이트, academy_members 무관)
        — 전체 학원 횡단 조회, level/source/code/q/academyId 필터, 페이지네이션
        — 레벨 뱃지, 상세 모달 (stack trace 포함)
        — 023 마이그레이션: app_logs_select_by_owner RLS 정책 DROP
  - [x] Step 6: `console.*` 사용 금지 ESLint rule + 17개 sweep (production 코드, logger.ts/테스트 제외)
        — `no-console` rule `"warn"` → `"error"` 승격, logger.ts+테스트 파일 override 추가
        — `src/` 전수 치환 (lib 3개 + components 4개 + hooks 2개 + app 2개 파일)
        — 테스트 spy 4개 `console.warn` → `logger.warn` 업데이트
- [x] 성능 최적화 (번들 사이즈, 초기 로딩) — 완료 (PR#58)
      — react-router-dom/uid/template SVGs 제거 (dead deps cleanup)
      — PDF 스택(jspdf+html2canvas) dynamic import → 클릭 시 온디맨드 로드
      — 3개 모달 next/dynamic { ssr: false } + experimental.optimizePackageImports: ["sonner"]
      — /schedule First Load JS: **385 kB → 200 kB (−48%)**
- [x] 접근성(a11y) 개선 — 완료 (PR#58)
      — useModalA11y 훅 신규: Escape, Tab 포커스 트랩, return-focus
      — EditSessionModal/GroupSessionModal/DataConflictModal: role=dialog + aria-modal + aria-labelledby
      — SessionBlock: div → button + aria-label(학생/과목/요일/시간) + focus-visible 아웃라인
      — StudentInputSection/SubjectInputSection/EditSessionModal: label/htmlFor 연결
      — eslint-plugin-jsx-a11y (recommended/warn 레벨) + aria-live 플레이스홀더
      — 테스트 +29개 (1255 → 1284)

## Phase 3: 디자인 리뉴얼 (진행 중)
> Phase 2B 안정화 후 진행.
> 스펙: `docs/superpowers/specs/2026-04-15-phase3-design-system-design.md`
> **Dual-Mode 아키텍처:** Admin(Amber 다크, 관리 영역) + Surface(Q Pastel, 시간표 그리드/PDF)

- [x] UI/UX 감사 (현재 디자인 문제점 정리) — 스펙 §5 감사 결과 참조 (2026-04-15)
- [x] 디자인 시스템 정의 (색상, 타이포그래피, 간격) — @theme SSOT 설계 완료 (2026-04-15)
- [x] 토큰 SSOT 구현 — @theme 통합, tailwind.config.ts 삭제, 14개 CSS Module→Tailwind, hex→CSS var 전환 (PR#44)
- [x] 랜딩 페이지 리디자인 — Product-Led 랜딩, LandingNav, 인라인→Tailwind (PR#42)
- [x] 시간표 그리드 UI 개선 — Full Redesign 완료 (PR#44)
- [x] 학생/과목 관리 페이지 UI 개선 — Full Redesign 완료 (PR#44)
- [x] 모바일 반응형 강화 — Full Redesign 완료 (PR#44)
- [x] PDF 출력 레이아웃 개선 — Full Redesign 완료 (PR#44)

## Phase 4: 기능 확장 (진행 중)

### 완료
- [x] 강사(Teacher) 뷰 — Teacher 엔티티, Teacher CRUD, 세션 배정, /teacher-schedule 읽기 전용 페이지 (PR#45)
- [x] Color-by 토글 UI — 원장 뷰에서 과목/학생/강사 색상 기준 전환 (PR#45)
- [x] CSS Modules → Tailwind 전면 이관 — 14개 모듈 삭제 완료 (PR#44)
- [x] Phase 3 Polish — SessionBlock `onDelete` prop + 컨텍스트 메뉴 삭제 연결 (PR#58)
- [x] Phase 3 Polish — ConfirmModal `useModalA11y` 마이그레이션 (Escape + focus trap) (PR#58)
- [x] Phase 3 Polish — LoginButton `supabase.auth.signOut()` 교체 (수동 localStorage 스크럽 제거) (PR#58)

- [x] 월별 뷰 — 3-way 토글(일별/주별/월별), MonthDayCell, ScheduleMonthlyView, 날짜 클릭→일별 전환 (PR#59)
- [x] 공유 링크 (`/share/{token}`) — share_tokens 테이블, 공개 API, 읽기 전용 시간표 페이지, Settings 관리 UI (PR#60)

- [x] 시간표 템플릿 — templates 테이블, 저장/적용 모달, useTemplates 훅, name-based 매칭 (PR#61)
- [x] 출석 관리 — attendance 테이블, GET/POST API, bulk upsert, AttendanceSheet, useAttendance 훅, 일별 뷰 연동 (PR#62)

- [x] 학원생 자동 알림 (시간표 변경 시) — E안: /share/{token} 공유 페이지 변경 배지. academies.schedule_updated_at (sessions trigger), share_tokens.last_viewed_at, ScheduleChangeBanner molecule, migration 029

---

## Phase 5 — Stabilize & Unify (Post-launch)
> 마스터 스펙: `docs/superpowers/specs/2026-04-17-phase5-stabilize-and-unify-design.md`

### P5-D — Bugfix ✅ (PR#64, #65)
- [x] D-1: 비로그인 방문 시 데이터 충돌 false positive 제거 (`isEmptyData` 판정 기준 변경)
- [x] D-2: Pretendard Subset 폰트 실탑재 — PDF 한글 깨짐 수정
- [x] D-3: PDF 다운로드 버튼 뷰 라벨 표시 (일별/주간/월별)

### P5-A — Global Nav & Account Shell ✅ (PR#66, #67, #68)
- [x] A-1: AccountMenu molecule 신설 + TopBar(Bell 제거) + Sidebar 하단 compact 아바타
- [x] A-2: ScheduleActionBar — PDF·템플릿·공유 버튼 통합, 라벨 명확화
- [x] A-3: HelpDrawer + HelpTooltip 도움말 시스템 (? 버튼, 5개 섹션, ColorBy 옆 i 버튼)

### P5-B — Design System Consistency ✅
- [x] B-1: `SubjectChip` primitive 신설 + `SchedulePreview` primitive 신설 + `getSessionSubject` 정규 위치 승격 → 랜딩 ScheduleMockup → SchedulePreview 교체 완료 (PR 진행 중)
- [x] B-2: Daily/Monthly 뷰에 `data-surface="surface"` 적용 (주간 뷰와 통일)
- [x] B-3a: `SessionBlock` 내부 리라이트 — SubjectChip을 시각 프리미티브로 사용, 모든 공개 API 계약 보존
- [x] B-3b: Weekly 그리드 내부 리라이트 — `TimeTableCell` 신설(DropZone 대체), `TimeTableRow` 간소화, `DropZone.tsx` 삭제, `TimeTableGrid` 루트에 `data-surface="surface"` 추가, Q Pastel 그리드 토큰 적용. 20개 공개 API, data-testid, virtual-scrollbar, schedule_scroll_position 계약 보존.
- [x] B-3: `SubjectChip` 기존 뷰(Monthly/Daily) 전면 적용 완성 (Phase 6에서 SubjectChip → SessionCard로 대체하며 완료)
- [x] B-4: `:root` 레거시 토큰 감사 및 제거 (`@theme` SSOT 단일화)

### P5-C — /schedule UX Polish ✅
- [x] C-1: 학생 리스트 패널 → ColorBy=학생 시만 표시되는 칩 필터로 전환 (StudentFilterChipBar)
- [x] C-2: ColorBy 토글 시각 통일 (SegmentedButton atom — Day/Week/Month + ColorBy 동일 스타일)
- [x] C-3: 그룹수업 학생 필터 로직 (멀티셀렉트, OR 로직, +N 뱃지, useStudentFilter)
- [x] C-4: 템플릿 affordance (라벨 명확화 + i 버튼 툴팁)
- [x] C-5: PDF 고급 스코프 (범위 선택 다이얼로그)

---

## Phase 6 — Schedule Body Unification ✅ (2026-04-18)
> 스펙: `docs/superpowers/specs/2026-04-17-schedule-body-unification-design.md`
> Weekly/Daily/Monthly/Landing/PDF 5개 surface를 SessionCard primitive로 통일. 3-tone 파스텔 색, D-hybrid 겹침, CSS Grid 세로 시간축.

| 서브페이즈 | PR | 내용 | 상태 |
|---|---|---|---|
| A | #77 | `tintFromHex` util + `SessionCard` 4-variant primitive + `SessionOverflowPopover` | ✅ |
| G | #78 | `HelpTooltip` viewport flip + `AccountMenu` compact anchor | ✅ |
| B1 | #79 | `SessionBlock` 3-tone 파스텔 (resolveSessionTone, accent 바) | ✅ |
| B2 | #80 | Weekly 그리드 CSS Grid transpose (rows=시간, cols=요일) | ✅ |
| B3 | #81 | D-hybrid overlap (≤3 균등, ≥4 cap-2 + overflow pill) | ✅ |
| D | #82 | `MonthDayCell` → `SessionCard chip` | ✅ |
| E | #83 | `SchedulePreview` → `SessionCard preview` | ✅ |
| F | #84 | PDF `lightenColor` → `tintFromHex` 공유 전환 | ✅ |
| C | #85 | `ScheduleDailyView` → `SessionCard row` | ✅ |

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

### Deferred / 백로그
- 학원장용 활동 히스토리 (audit_events 테이블) + 개발자 공지 시스템 — 별도 Phase 예정
  (app_logs는 개발자 전용으로 재정의. 학원장이 필요한 것은 멤버 초대/등급 변경 등의 audit log)

## Phase H — 드래그 미리보기 Drop 버그 (재설계)

> **배경:** Phase E (PR #91, pointer-events:none 시도) → Phase F (PR #92, 되돌림) → Phase G (PR #93, hasDragTarget 조건부 none → 같은 회귀 재발) → Phase G revert (hotfix).
> 교훈: 드래그 소스 요소의 pointer-events를 드래그 도중 변경하면 Chrome이 네이티브 drag를 취소함. 합성 DragEvent로는 재현 불가 — **실측 마우스 드래그 필수**.

### 해결해야 할 현상 (Phase D+F 조합에서도 남는 동작)
- `computeTentativeLayout`이 드래그 대상 세션을 target 위치로 이동 렌더.
- 이 미리보기 SessionBlock은 `pointer-events: auto` 유지 중 → drop을 흡수 → 데이터 갱신 실패(no-op).
- 즉, "미리보기 블록 위에서 release"하면 실제 데이터가 안 바뀜. 옆 cell로 살짝 비켜서 놓으면 정상.

### 후보 접근 — Ghost Div 전략
**핵심:** 미리보기 렌더를 SessionBlock이 아닌 별도 "ghost" div로 분리.
1. `computeTentativeLayout`을 되돌려 원본 `sessions` Map을 그대로 전달 (드래그 대상은 목록에 그대로 남음 — opacity 0.4로만 표시).
2. `TimeTableGrid`에 target 위치 기준 `<div data-testid="drag-ghost" style={{ pointer-events: none, ... }}>` 렌더.
3. Ghost는 항상 `pointer-events: none` — drop이 밑 cell로 투과.
4. 드래그 소스 SessionBlock은 `pointer-events` 절대 변경 안 함 (Chrome 드래그 취소 방지).

### 대안 — 완전 포기
"같은 자리 drop = no-op" UX를 의도된 "취소" 동작으로 수용하고 Phase H를 영구 보류. Phase D 픽스로 다른 cell 이동은 이미 정상.

### 검증 필수 조건 (Phase F 교훈)
- Playwright 합성 이벤트만으로 통과시키지 말 것. 반드시 아래 중 하나로 확인:
  1. 실제 마우스 드래그 + Console 로그 파일 캡처 (Phase I 로그 인프라 완성 후)
  2. `mcp__playwright__browser_drag` (실제 mouse path 시뮬레이션)
  3. computer-use 실측 (Chrome이 read-tier라 Claude-in-Chrome extension 필요)

### 착수 조건
- Phase I (로그 인프라) 완료 후 진행. 실측 드래그 로그를 파일로 자동 저장할 수 있어야 회귀 검증 가능.

## Phase I — Browser Console Log Capture 인프라

> **배경:** Phase E/G 모두 Playwright 합성 DragEvent로는 통과했으나 실측에서 실패. 사용자가 매번 DevTools 콘솔 복붙 제공해야 디버깅 가능 → Claude가 직접 로그 파일 읽을 수 있어야 반복 회귀 방지.

### 목표
브라우저에서 발생한 `logger.*` 호출을 프로젝트 로컬 파일(`class-planner/logs/browser-YYYYMMDD.jsonl`)에 자동 수집. Claude가 `Grep` / `tail`로 직접 조회.

### 제안 구성 (MVP)
1. `src/app/api/dev/log/route.ts` — dev 전용 POST 엔드포인트. `NODE_ENV !== "development"`이면 404. body = `LogRecord[]`, `logs/browser-YYYYMMDD.jsonl`에 append.
2. `src/lib/logger.ts` — dev 모드에서 메모리 버퍼에 누적, 1초 debounce로 `/api/dev/log`에 fire-and-forget POST (sendBeacon 우선, fallback fetch).
3. `logs/.gitignore` — 로그 파일 git 제외.
4. `docs/debugging-guide.md` — "Claude가 실측 드래그 로그 확인하는 법" 절차화.

### 확장 (omni-radar 연동)
로컬 파일 방식 검증 후 omni-radar HTTP ingest endpoint로 전환 고려. dev-pack CLAUDE.md에 이미 예고된 경로 ("API 레이어에 radar hook 주입, 또는 omni-radar HTTP endpoint로 이벤트 전송"). 전사 관측 인프라 통합이 목적이면 이 경로.

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
| 2026-04-16 | F3 Step 5 완료 확인 — user feedback toast + apiSync retry queue (PR#29 → dev 머지 완료) |
| 2026-04-16 | Token SSOT 완성 — @theme 확장, 14개 CSS Module 삭제, hex→CSS var 전환, TSX inline hex 정리 (PR#44 → dev 머지 완료) |
| 2026-04-16 | Phase 4 Teacher 완료 — Teacher CRUD + Session 배정, Color-by 토글, /teacher-schedule 뷰 (PR#45 → dev 머지 완료) |
| 2026-04-17 | Phase 3 Polish (W1) — SessionBlock onDelete, ConfirmModal useModalA11y, LoginButton signOut 교체 (PR#58) |
| 2026-04-15 | Phase 2B Step 5 완료 — 개발자 로그 뷰어 /admin/logs (ADMIN_EMAILS 게이트, 필터/페이지네이션, 상세 모달) |
| 2026-04-15 | Phase 2B Step 6 완료 — no-console ESLint rule (warn→error), production 17개 console.* → logger.* 치환 |
| 2026-04-15 | Phase 2B 성능 최적화 완료 — /schedule First Load JS 385→200 kB (−48%), PDF/모달 lazy-load, dead deps 제거 |
| 2026-04-15 | Phase 2B 접근성 개선 완료 — useModalA11y 훅, SessionBlock→button, 폼 라벨, jsx-a11y 린트 가드 |
| 2026-04-17 | Phase 3 Polish + Phase 4 W1~W3 완료 — ConfirmModal a11y, signOut, SessionBlock onDelete, 월별 뷰(PR#59), 공유 링크(PR#60) |
| 2026-04-17 | Phase 4 W4~W5 완료 — 시간표 템플릿(PR#61), 출석 관리(PR#62) |
| 2026-04-17 | P5-D 완료 — 데이터 충돌 false positive 수정(PR#64), Pretendard 폰트 + PDF 뷰 라벨(PR#65) |
| 2026-04-17 | P5-A 완료 — AccountMenu + TopBar/Sidebar 탑재(PR#67), ScheduleActionBar(PR#66), HelpDrawer + HelpTooltip(PR#68) |
| 2026-04-17 | P5-B 완료(B-4) — :root 레거시 토큰 감사: 5개 grid-* 삭제, --color-danger-dark + --color-success-dark 정의, --color-warning 삭제 |
| 2026-04-18 | Phase 6 완료 — SessionCard 4-variant + tintFromHex + D-hybrid overlap + Weekly CSS Grid transpose + Daily/Monthly/Landing/PDF 통일 (PR#77~#85 → dev 머지) |
| 2026-04-17 | P5-C C-5 완료 — PDF 범위 선택 다이얼로그(PdfExportRangeModal), PdfRenderer multi-week, dateUtils 신설 |
| 2026-04-24 | 드래그 UX Phase D/F 완료 · Phase E(#91)/G(#93) revert (hotfix). Phase H(ghost-div 재설계) + Phase I(브라우저 로그 캡처) 백로그 등록 |
