# Class Planner — AI Assistant 지침

## 프로젝트 개요
학원 운영자를 위한 시간표 관리 시스템. 학원생 변동이 잦은 환경에서 시간표를 빠르게 구성하고, PDF로 다운로드하여 바로 인쇄할 수 있도록 설계됨.

- **도메인:** `class-planner.info365.studio` (현재 AWS Lightsail + Supabase 하이브리드 — Lightsail: 앱 서버, Supabase: Auth + DB)
- **사용자:** 학원 운영자 (현재 1명, 확장 계획)
- **핵심 가치:** 시간표 구성 속도, 인쇄 가능한 PDF 출력, 직관적 UI

## SSOT 참조 우선순위
1. `class-planner/ARCHITECTURE.md` — 프로젝트 헌법
2. `class-planner/docs/adr/` — 아키텍처 결정 기록
3. `docs/code-convention.md` — dev-pack 공용 코딩 규칙
4. `class-planner/TASKS.md` — 단계별 진행 현황
5. `class-planner/tree.txt` — 현재 파일 구조

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
- **Atoms:** Button, Input, Label, AuthGuard, ErrorBoundary, ThemeToggle
- **Molecules:** SessionBlock, TimeTableRow, ConfirmModal, DropZone, PDFDownloadButton
- **Organisms:** TimeTableGrid, StudentPanel, StudentsPageLayout, SubjectsPageLayout

### 데이터 관리 패턴
- **Local-first:** localStorage 직접 조작으로 즉시 반응 (0ms)
- **Debounced sync:** 30초 debounce로 서버 자동 동기화, 최대 5분 안전장치
- **useLocal 훅 우선:** 신규 기능은 반드시 `useXxxLocal` 훅 사용 (레거시 API 기반 훅 사용 금지)

## 코딩 규칙
- TypeScript strict mode 준수
- 모든 스타일은 Tailwind CSS 클래스 사용 (인라인 스타일 금지)
- 수정된 코드에 대한 테스트 작성/업데이트 필수
- Clean Architecture 계층 분리 위반 금지
- Merge commit 필수 (`git merge --no-ff`)

## 테스트 전략
| 계층 | 목표 커버리지 | 도구 |
|------|-------------|------|
| Domain | 100% | Vitest (순수 단위 테스트) |
| Application | 90%+ | Vitest (Mock Repository) |
| Infrastructure | 80%+ | Vitest (실제 외부 의존성) |
| Presentation | 70%+ | Vitest + RTL |
| E2E | 주요 시나리오 | Playwright |

## 개발 워크플로우
```bash
# 작업 중 빠른 피드백 (tsc + unit, 수십 초)
npm run check:quick

# 커밋/푸시 전 1회 (tsc + unit + build, 1분 내외)
npm run check

# PR 올리면 GitHub Actions (ci.yml) 가 자동으로 검증
# — check job: type-check + lint + unit test
# — build job: production build
# — e2e job:  Playwright Chromium golden path
```

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
class-planner는 Next.js 기반이므로 omni-radar ASGI 미들웨어를 직접 사용할 수 없다. 향후 마이그레이션 시 별도 연동 방식을 설계해야 함 (예: API 레이어에 radar hook 주입, 또는 omni-radar HTTP endpoint로 이벤트 전송).

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
