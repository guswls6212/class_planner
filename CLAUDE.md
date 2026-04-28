# Class Planner — AI Assistant 지침

## 프로젝트 개요
학원 운영자를 위한 시간표 관리 시스템. 학원생 변동이 잦은 환경에서 시간표를 빠르게 구성하고, PDF로 다운로드하여 바로 인쇄할 수 있도록 설계됨.

- **도메인:** `class-planner.info365.studio` (현재 AWS Lightsail + Supabase 하이브리드 — Lightsail: 앱 서버, Supabase: Auth + DB)
- **사용자:** 학원 운영자 (현재 1명, 확장 계획)
- **핵심 가치:** 시간표 구성 속도, 인쇄 가능한 PDF 출력, 직관적 UI

## SSOT 참조 우선순위
1. `ARCHITECTURE.md` — 프로젝트 헌법 (계층 구조, 데이터 모델, 배포)
2. `UI_SPEC.md` — UI 동작 소스 오브 트루스 (컴포넌트, 인터랙션, 검증 라우트)
3. `docs/adr/` — 아키텍처 결정 기록 (왜 이 결정을 했는지)
4. `docs/code-convention.md` — class-planner 코딩 규칙 (글로벌: `../docs/code-convention.md`)
5. `TASKS.md` — 단계별 진행 현황

## 문서 맵 (Documentation Map)

| 토픽 | 문서 | 언제 읽을지 |
|------|------|------------|
| 계층 구조, 데이터 모델, 배포 | [ARCHITECTURE.md](ARCHITECTURE.md) | 구조적 변경 전 |
| UI 컴포넌트, 훅, 인터랙션, 검증 라우트 | [UI_SPEC.md](UI_SPEC.md) | **UI/컴포넌트 수정 전 필독** |
| 개발 프로세스, 테스트, 검증, E2E, 브랜치/CI | [docs/development-guide.md](docs/development-guide.md) | 개발/테스트/커밋 시 |
| 배포 절차, 환경 변수, Lightsail | [docs/deployment-guide.md](docs/deployment-guide.md) | 배포/환경설정 시 |
| 코딩 규칙 (파일크기, 언어, 스타일) | [docs/code-convention.md](docs/code-convention.md) | 코드 작성/리뷰 시 |
| 아키텍처 결정 이유 | [docs/adr/](docs/adr/) | "왜 이렇게 됐는지" 이해 시 |
| AI 워크플로우 (Superpowers, 훅, opusplan) | [../docs/ai-workflow-guide.md](../docs/ai-workflow-guide.md) | AI 도구/모드 사용 시 |
| 기능 설계 문서 | [docs/superpowers/specs/](docs/superpowers/specs/) | 기능 배경 이해 시 |
| AI 워크플로우, 도구 선택 기준 | [../docs/ai-workflow-guide.md](../docs/ai-workflow-guide.md) | Superpowers/도구 사용 시 |

## 기술 스택
- **Frontend:** Next.js 15.5.9 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS 4.0 (인라인 스타일 금지)
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (현재 Supabase JSONB, 정규화 마이그레이션 예정)
- **Auth:** OAuth (Google, Kakao) — 현재 Supabase Auth
- **Testing:** Vitest, Playwright, React Testing Library
- **Architecture:** Clean Architecture + Atomic Design

## 아키텍처 규칙

### Clean Architecture 계층 분리 (Non-negotiable)
- **Domain:** 비즈니스 로직, 엔티티, 값 객체. 외부 의존성 절대 금지.
- **Application:** 유스케이스, 서비스, 매퍼. Domain만 의존.
- **Infrastructure:** 외부 의존성 구현 (DB, API). Application 인터페이스를 구현.
- **Presentation:** React 컴포넌트 (Atomic Design: atoms → molecules → organisms).

### Atomic Design 컴포넌트 분류
- **Atoms:** Button, Input, Label, AuthGuard, ErrorBoundary, ThemeToggle, StudentListItem, SubjectListItem
- **Molecules:** SessionBlock, TimeTableRow, ConfirmModal, DropZone, PDFDownloadButton, DataConflictModal, SessionForm, StudentInputSection, StudentList, SubjectInputSection, SubjectList
- **Organisms:** TimeTableGrid, StudentPanel, StudentsPageLayout, SubjectsPageLayout, LoginButton, StudentManagementSection, SubjectManagementSection, AboutPageLayout
- 상세 컴포넌트 인벤토리: [UI_SPEC.md](UI_SPEC.md) § 3

### 데이터 관리 패턴
- **Local-first:** localStorage 직접 조작으로 즉시 반응 (0ms)
- **Fire-and-forget sync:** `src/lib/apiSync.ts`의 `syncXxxCreate/Delete` 함수로 서버에 비동기 동기화. 실패해도 localStorage는 유지.
- **익명 사용자:** localStorage만 사용 (key: `class_planner_anonymous`). 서버 호출 없음.
- **로그인 후:** localStorage (key: `class_planner_{userId}`) + 서버 양방향 동기화
- **useLocal 훅 우선:** 신규 기능은 반드시 `useXxxLocal` 훅 사용 (레거시 API 기반 훅 사용 금지)

## 코딩 규칙
- TypeScript strict mode 준수
- 모든 스타일은 Tailwind CSS 클래스 사용 (인라인 스타일 금지)
- 수정된 코드에 대한 테스트 작성/업데이트 필수
- Clean Architecture 계층 분리 위반 금지
- Merge commit 필수 (`git merge --no-ff`)

### 브랜치 규칙 (Non-negotiable)
- `main`/`dev` 직접 push/commit 금지
- 모든 작업은 `dev`에서 분기한 작업 브랜치에서 진행
- 작업 브랜치 → `dev` PR → CI 통과 → 머지
- `dev` → `main` PR → CI 통과 → 머지 → 자동 배포
- hotfix 예외: `main`에서 분기 → `main` + `dev` 양쪽에 PR
- 상세: `docs/development-guide.md` § 브랜치 전략 & CI/CD

## 테스트 전략
| 계층 | 목표 커버리지 | 도구 |
|------|-------------|------|
| Domain | 100% | Vitest (순수 단위 테스트) |
| Application | 90%+ | Vitest (Mock Repository) |
| Infrastructure | 80%+ | Vitest (실제 외부 의존성) |
| Presentation | 70%+ | Vitest + RTL |
| API Routes | 90%+ | Vitest (Mock Supabase) |
| E2E | 주요 시나리오 | Playwright |

## 개발 워크플로우

### 브랜치 플로우
```
dev에서 분기 → 작업 → PR to dev → CI 통과 → 머지 → dev→main PR → 배포
```

### 로컬 검증
```bash
# 작업 중 빠른 피드백 (tsc + unit, 수십 초)
npm run check:quick

# 커밋/푸시 전 1회 (tsc + unit + build, 1분 내외)
npm run check
```

### CI/CD (GitHub Actions)
- **ci.yml**: PR 생성 또는 main/dev push 시 자동 실행
  - check job: type-check + lint + unit test
  - build job: production build
  - e2e job: Playwright Chromium golden path
- **deploy.yml**: main CI 성공 시 자동 배포 (ghcr.io → Lightsail)

### 세션 완료 체크리스트
- [ ] `npm run check:quick` 통과
- [ ] 작업 브랜치 → dev PR 생성 (CI 통과 확인)
- [ ] 로컬 작업 브랜치 삭제 (`git branch -d <branch>`)
- [ ] worktree 사용 시 제거 (`git worktree remove <path>`)
- [ ] 로컬에 main, dev 외 브랜치 없음 확인

### 세션 중단 감지
로컬에 남아있는 작업 브랜치 = 이전 세션에서 중단된 작업.
`bash scripts/check-stale-branches.sh`로 확인 가능.

## Claude Code 훅 시스템

dev-pack 전체에서 공유하는 Claude Code 훅. 상세: [`../docs/ai-workflow-guide.md`](../docs/ai-workflow-guide.md)

| 훅 | 트리거 | 역할 | 위치 |
|----|--------|------|------|
| `session-start-reset.sh` | 세션 시작 | 이전 세션 센티넬 삭제, stale 브랜치 감지, baseline 저장 | `scripts/hooks/` |
| `dirty-tree-stop-hook.sh` | 세션 종료 | 커밋되지 않은 변경 파일이 있으면 종료 차단 | `scripts/hooks/` |
| `ui-verify-stop-hook.sh` | 세션 종료 | UI 파일 변경 시 브라우저 검증 없으면 종료 차단 | `scripts/hooks/` |
| `check-stale-branches.sh` | 수동/세션 시작 | 로컬에 남아있는 작업 브랜치(중단된 세션) 감지 | `scripts/` |

**Bypass:** `.claude/dirty-ok` (dirty-tree), `.claude/ui-verified` (ui-verify) — 센티넬은 다음 세션 시작 시 자동 삭제.

## UI Verification (class-planner 전용 가이드)

dev-pack 공통 UI Verification Protocol(`../CLAUDE.md` § UI Verification Protocol)에 따른 class-planner 세부 사항.

### Dev 서버 시작
```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run dev
# → http://localhost:3000
```

### 검증 대상 라우트 (변경된 컴포넌트/페이지에 따라 선택)
| 변경 파일 패턴 | 확인할 라우트 |
|---|---|
| `src/app/schedule/**` | `/schedule` |
| `src/app/students/**` | `/students` |
| `src/app/subjects/**` | `/subjects` |
| `src/components/molecules/SessionBlock*` | `/schedule` |
| `src/components/atoms/**` | 관련 모든 페이지 |

### 주요 Golden Path (수업 추가 모달)
1. `/schedule` 접속 → "수업 추가" 버튼 클릭
2. 학생 이름 입력 → 기존 학생 검색 → 추가
3. 존재하지 않는 이름 입력 → CTA `＋ '{이름}' 새 학생으로 추가` 렌더 확인
4. CTA 클릭 → 학생 생성 → 선택 탭 반영 확인
5. 과목/요일/시간 선택 → "추가" → 시간표에 블록 등록 확인

### 모바일 뷰포트 확인 (모달 변경 시)
Playwright MCP 설정에서 viewport를 375×667로 변경 후 재확인.

### 검증 도구 선택

**1차 — Playwright MCP (항상 실행)**
구조적 검증: 버튼 동작, 폼 입력, API 연동, 라우트 이동.
`mcp__playwright__navigate` → 클릭/입력 → `mcp__playwright__screenshot`

**2차 — computer-use (시각적 변경 시 추가 실행)**
탐험적 검증: Playwright 스크립트로 표현하기 어려운 시각적 상호작용.

실행 기준 (하나라도 해당하면 사용):
- 모달/드로어/팝오버 수정
- 드래그앤드롭 (시간표 블록 이동 등)
- 스크롤 위치 보존 관련 변경
- 반응형 레이아웃 (모바일 뷰포트 영향)
- CSS 애니메이션/트랜지션 변경
- 시각적 색상/폰트/간격 변경

Claude Max 구독 내 실행 (추가 API 비용 없음). computer-use tool로 브라우저를 직접 조작하며 시각적 이상을 탐지한다.

### 드래그 관련 변경 시 필수 수동 체크 (Non-negotiable)

아래 파일 중 하나라도 수정된 PR은 머지 전 반드시 수동 드래그 검증을 수행한다:
- `src/components/organisms/TimeTableGrid.tsx`
- `src/components/molecules/TimeTableRow.tsx`
- `src/components/molecules/TimeTableCell.tsx`
- `src/components/molecules/SessionBlock.tsx`
- `src/hooks/useDragController.ts`
- `src/app/schedule/_utils/dndHelpers.ts`
- `src/app/schedule/page.tsx` (handleSessionDrop / isStudentDragging 관련)

**검증 체크리스트 (computer-use 또는 직접 브라우저):**
- [ ] SessionBlock을 다른 요일 cell로 drag → drop → weekday 변경됨 (localStorage DevTools 확인)
- [ ] SessionBlock을 같은 요일 다른 시간으로 drag → drop → startsAt 변경됨
- [ ] drag 시작 시 target 요일 컬럼 좌우 10px 여백 표시됨
- [ ] drag 중 DragGhost가 마우스 위치에 따라 이동함
- [ ] source block이 원 위치에 흐릿하게(opacity 0.18) 유지됨
- [ ] 같은 위치 drop → 이동 없음 (조용한 취소)
- [ ] drag 취소(Esc / 창 전환) → `useDragController.isAnyDragging()` false로 복구됨

**왜 Playwright E2E가 충분하지 않은가:**
Chrome native drag-and-drop은 pointer-events hit-test와 z-index 기반 drop 타겟 결정이 브라우저 native 레이어에서 처리된다. Playwright의 합성 DragEvent는 이를 재현하지 못한다(TASKS.md Phase H 교훈). 이 체크리스트는 그 한계를 보완하는 필수 수동 gate이다.

### UI Verification Report 포맷

```
## UI Verification Report

### 1차 — Playwright MCP
- Flows tested: ...
- Screenshots: ...
- Issues found: None / [목록]

### 2차 — computer-use (해당 시)
- Scope: [어떤 시각적 요소를 탐험했는지]
- Observations: [발견 사항]
- Issues found: None / [목록]
```

## omni-radar 연동

class-planner는 omni-radar-extension(Chrome MV3)이 `radar_console_hook.js`를
`document_start`에 주입하는 방식으로 omni-radar에 연동된다. console/fetch/XHR/
localStorage 이벤트가 실시간으로 `omni-radar/logs/radar_YYYYMMDD.jsonl`에 기록되며
`http://127.0.0.1:8888` 대시보드에서 확인 가능.

**Extension 설정 (Chrome 확장 프로그램 팝업):**
- Server URL: `http://127.0.0.1:8888`
- Target patterns: `http://localhost:3000/*`

**디버깅 시 진입점 (`../CLAUDE.md` § Debug Protocol 참조):**
```bash
omni-radar/scripts/radar-query --target browser --keyword <symbol> --since 10m
omni-radar/scripts/radar-query --type console_log --level ERROR --since 10m
```

**알려진 보안 주의:** 현재 hook은 localStorage 변경 페이로드를 마스킹 없이 전송한다.
Supabase auth token (`sb-*-auth-token`)이 평문으로 로그에 남으므로, 로그 파일을
외부에 공유하지 말 것. 향후 token-key 마스킹 필터를 hook 측에 추가할 예정 (별도 ADR).

## Analysis Perspectives (Multi-Perspective Analysis용)
- **학원 운영자:** 이 변경이 시간표 구성 속도에 영향을 주는가? 비개발자가 혼란 없이 사용할 수 있는가?
- **인쇄 품질:** PDF 출력 시 레이아웃이 깨지지 않는가? 종이에 인쇄했을 때 읽을 수 있는가?
- **오프라인 내성:** 네트워크 불안정 시 데이터 유실 가능성은?

## 배포 현황 (ADR-001 기준, 2026-04-10 완료)

**하이브리드 아키텍처 (확정):**
- **앱 서버:** AWS Lightsail 1GB (ap-northeast-2) — Docker + Nginx + Let's Encrypt
- **Auth + DB:** Supabase 유지 (OAuth, PostgreSQL)
- **도메인:** `class-planner.info365.studio`
- **CI/CD:** GitHub Actions `ci.yml` (check→build→e2e) + `deploy.yml` (ghcr.io→Lightsail SSH)

**결정된 사항 (변경 없음):**
- Self-hosted PostgreSQL/NextAuth 전환 기각 (결합도 높음, ADR-001)
- JSONB → 정규화 마이그레이션은 별도 Phase에서 진행 (ADR-002)
- 모니터링은 omni-radar 연동 방안 검토 중 (별도 스펙 필요)
