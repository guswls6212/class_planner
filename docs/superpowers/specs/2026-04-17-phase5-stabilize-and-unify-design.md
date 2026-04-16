# class-planner Phase 5 — Stabilize & Unify

Post-launch 사용자 피드백 13건을 4개 페이즈로 묶어 순차 해결하는 마스터 스펙.

> **승인일:** 2026-04-17 | 각 페이즈는 별도 implementation plan으로 실행.

---

## Context

`f4681f7` 머지로 class-planner가 `dev`에 반영된 직후 사용자 피드백 13건이 접수됐다.
- 2건은 명확한 버그(데이터 충돌 false positive, PDF 한글 깨짐)
- 10건은 UX/디자인 정합성·탐색성 이슈 (숨은 기능, 뷰 간 통일감, 랜딩 드리프트, 템플릿 affordance, 첫사용자 가이드 등)

Phase 3에서 정의한 Dual-Mode(Admin Amber / Surface Q Pastel) 디자인 시스템은 선언만 되고 전 페이지에 일관 적용되지 못했다. Phase 5는 **새 기능 추가 없이** 이 실행 격차와 탐색성 격차를 해소해 "쓸 수 있는 제품"으로 안정화한다.

### 13개 이슈 → 페이즈 매핑

| # | 이슈 (사용자 원문 요약) | 페이즈 |
|---|---|---|
| 5 | 비로그인 첫 방문 직후 로그인 시 데이터 충돌 모달이 false로 뜸 | **P5-D** |
| 12a | PDF 다운로드 시 글자 깨짐 | **P5-D** |
| 12b | PDF가 일/주/월 중 뭘 다운로드하는지 알 수 없음 | P5-D(라벨) + P5-C(고급) |
| 1 | 로그아웃 UI 없음 | **P5-A** |
| 10 | 초대링크 등 숨은 기능 접근 경로 없음 | **P5-A** |
| 13 | 첫사용자 가이드 부재 (드로워 + i버튼 하이브리드 제안) | **P5-A** |
| 2 | 랜딩 디자인이 브레인스토밍 결과와 다름 | **P5-B** |
| 3 | 랜딩의 주간 시간표와 실제 주간 시간표 디자인이 다름 | **P5-B** |
| 4 | 일/주/월 뷰 디자인 통일감 부족 | **P5-B** |
| 6 | 전체 페이지가 따로 노는 느낌 | **P5-B** |
| 7 | `/schedule` 수강생 리스트가 거슬림 | **P5-C** |
| 8 | 과목/학생/강사 토글 가시성 부족 | **P5-C** |
| 9 | 그룹수업 학생 필터 로직 미정 | **P5-C** |
| 11 | 템플릿 저장/적용 용도 불명확 | **P5-C** |

### 실행 순서 및 근거
`P5-D → P5-A → P5-B → P5-C`

- **D 먼저** — 2건 버그는 사용자 신뢰를 깎고 UX 토의의 전제를 흔들며, 수정 리스크가 낮고 독립적이다.
- **A 다음** — B/C가 건드릴 `/schedule` 페이지 action 영역의 "이 기능을 어디 둘 것인가"라는 전제를 먼저 결정해야 한다. PDF·템플릿 등이 grid 밖 Action Bar로 이동하고 나야 B의 그리드 정합성 작업·C의 필터 UX 작업이 겹치지 않는다.
- **B → C** — 공통 primitive(`SchedulePreview`, `SubjectChip`)가 먼저 있어야 C의 세부 UX가 그 위에서 조립된다.

페이즈는 독립 PR 단위로 쪼개며, 각 페이즈 완료 시 `dev` 머지 + CI 통과 확인 후 다음으로 넘어간다.

---

## Phase P5-D — Bugfix: Data-Conflict Gate + PDF Korean Font

**포함 이슈:** 5, 12a, 12b(라벨 부분)
**규모:** 2-3 PR, ~1 일 작업 기준
**의존성:** 없음

### D-1. 데이터 충돌 false positive 제거 (이슈 5)

**근본 원인:** `useGlobalDataInitialization.ts:99-122`가 비로그인 방문자에게 `DEFAULT_SUBJECTS` 9개를 localStorage에 자동 시드한다. 이후 로그인 시 `checkLoginDataConflict`가 `isEmptyData(anon)`을 검사하지만 `isEmptyData`는 `subjects.length === 0`을 체크하므로 시드된 9개 때문에 false를 반환 → "conflict" 분기로 빠짐.

**수정 방향:** "시드 제거 + 의미 재정의" (사용자 선택 옵션 B)

**파일 변경:**
- `src/hooks/useGlobalDataInitialization.ts`
  - 비로그인 경로의 `DEFAULT_SUBJECTS` 시드 블록 제거.
  - `ANONYMOUS_STORAGE_KEY`는 사용자가 실제 mutation 액션(학생/과목/세션 추가)을 할 때에만 최초 생성.
- `src/lib/auth/handleLoginDataMigration.ts`
  - `isEmptyData` 시그니처 유지, 판정 기준을 `students.length === 0 && sessions.length === 0 && enrollments.length === 0`으로 변경.
  - `subjects`는 판정에서 제외(과목만 있고 학생/수업이 없는 상태는 "빈 상태"로 취급).
  - `enrollments` 필드 누락 버그도 함께 수정.
- `src/lib/constants/defaultSubjects.ts` (또는 현재 `DEFAULT_SUBJECTS` 정의 위치) — **삭제하지 않음**. P5-A의 빈 상태 온보딩 UI에서 재활용 여지 남김.

**테스트:**
- `src/hooks/__tests__/useGlobalDataInitialization.test.ts` — "방문만으로는 anon 스토리지가 생성되지 않음" 단위 케이스 추가.
- `src/lib/auth/__tests__/handleLoginDataMigration.test.ts`
  - "anon에 과목 9개만 있고 students/sessions/enrollments는 0 → action: use-server" 회귀 케이스.
  - "anon에 students 1명 있음, server는 enrollments 보유 → action: conflict" 교차 케이스.
- `tests/e2e/conflict-modal.spec.ts` — 기존 테스트를 새 정책 기준으로 갱신.

### D-2. Pretendard Subset 실탑재 (이슈 12a)

**근본 원인:** `src/lib/pdf/fonts/pretendard-subset.ts`의 `PRETENDARD_BASE64 = ""` 빈 플레이스홀더. jsPDF가 Helvetica로 폴백 → 한글 tofu.

**수정 방향:** Pretendard Subset (KS X 1001 2,350자 기준) 1회성 서브셋팅 후 커밋. (사용자 선택 옵션 A)

**파일 변경:**
- `scripts/generate-pdf-fonts.ts` — 신규 빌드 스크립트.
  - `@orioncactus/pretendard`의 `Pretendard-Regular.ttf`, `Pretendard-Bold.ttf`를 입력으로.
  - `subset-font` npm 패키지로 KS X 1001 + Basic Latin + 숫자 + 기본 기호로 서브셋팅.
  - base64 인코딩하여 `src/lib/pdf/fonts/pretendard-regular.ts`, `pretendard-bold.ts`에 `export const PRETENDARD_{REGULAR|BOLD}_BASE64 = "..."` 출력.
- `src/lib/pdf/fonts/pretendard-subset.ts` — 삭제, 위 2개 파일로 분리.
- `src/lib/pdf/PdfRenderer.ts` — jsPDF 초기화 직후:
  ```ts
  doc.addFileToVFS("Pretendard-Regular.ttf", PRETENDARD_REGULAR_BASE64);
  doc.addFont("Pretendard-Regular.ttf", "Pretendard", "normal");
  doc.addFileToVFS("Pretendard-Bold.ttf", PRETENDARD_BOLD_BASE64);
  doc.addFont("Pretendard-Bold.ttf", "Pretendard", "bold");
  doc.setFont("Pretendard", "normal");
  ```
  + PDF 생성 코드 전체를 동적 임포트로 감싸 초기 `/schedule` 번들에서 ~400KB 제거.
- `src/lib/pdf/PdfHeader.ts`, `PdfSessionBlock.ts`, `PdfGridLayout.ts` — 필요 지점에 `doc.setFont("Pretendard", "bold"|"normal")` 명시.
- `package.json` — `subset-font` devDependency, `"generate:pdf-fonts"` script 추가.

**테스트:**
- `src/lib/pdf/__tests__/PdfRenderer.test.ts` — 생성된 PDF 바이트 버퍼에 "Pretendard" 폰트 테이블 엔트리 포함 여부 스냅샷 검증.
- **수동 검증(필수)**: 한글 학생명/과목명/과거 주 주간 데이터로 PDF 생성 → 글리프 깨짐 0건 확인. README에 "희귀 한자는 지원 범위 밖" 주석 1줄.

### D-3. PDF 다운로드 라벨 명시 (이슈 12b 중 빠른 부분)

`PDFDownloadButton`이 현재 `view` (day | week | month) prop을 받아 라벨을 동적으로:
- "일별 시간표 PDF 다운로드" / "주간 시간표 PDF 다운로드" / "월별 시간표 PDF 다운로드"

다운로드 스코프 선택 다이얼로그(현재 주 vs 여러 주 범위)는 **P5-C로 이월**.

### D-검증
```bash
cd class-planner
npm run test -- useGlobalDataInitialization handleLoginDataMigration PdfRenderer
npm run build
npm run dev
```
1. 시크릿 브라우저 → `http://localhost:3000` 방문 → `/settings` → Google 로그인 → 충돌 모달이 뜨지 **않아야** 함. DevTools에서 `classPlannerData:anonymous` 키 존재하지 않는지 확인.
2. 기존 로컬 데이터 있는 브라우저 → 충돌 모달이 정상적으로 뜸(회귀 방지).
3. Day/Week/Month 각 뷰에서 PDF 다운로드 → 한글 모두 정상 렌더, 버튼 라벨이 현재 뷰를 반영.

---

## Phase P5-A — Global Nav & Account Shell

**포함 이슈:** 1, 10, 13
**규모:** 3-4 PR
**의존성:** P5-D 완료 후

### A-1. 계정 메뉴 탑재 (이슈 1, 10)

**현재 상태:** `LoginButton.tsx`에 완성된 아바타 드롭다운(로그아웃 포함)이 있으나 AppShell/TopBar/Sidebar/BottomTabBar 어디에도 마운트되지 않은 orphan.

**변경:**
- `src/components/organisms/LoginButton.tsx`의 드롭다운 UI를 `src/components/molecules/AccountMenu.tsx`로 추출 (`LoginButton`은 `/login` 페이지의 CTA 역할만 유지).
- `AccountMenu` 항목:
  - 비로그인: "로그인" 버튼 (클릭 시 `/login` 이동)
  - 로그인: 아바타 → 드롭다운 [사용자 이메일 표시 | 설정 | 초대 관리 | 로그아웃]
- `src/components/molecules/TopBar.tsx` 오른쪽 끝에 `AccountMenu` 마운트 (bell 아이콘은 **제거** — dead button).
- `src/components/molecules/Sidebar.tsx` 하단에도 데스크톱 fallback으로 간략 버전(아바타만) 배치.

### A-2. Schedule Action Bar 승격 (이슈 10)

**현재 상태:** `/schedule` 페이지에서 PDF 다운로드/템플릿 저장/템플릿 적용 버튼이 `schedule/page.tsx:1091-1126`에 inline flex row로 직접 박혀있고, 초대 링크는 `/settings` 내부에 숨어있음.

**변경:**
- `src/app/schedule/_components/ScheduleActionBar.tsx` 신설 — 그리드 상단 persistent toolbar. 항목:
  - PDF 다운로드 (view-aware label, D-3에서 처리)
  - 템플릿으로 저장
  - 템플릿 적용
  - 공유 링크 (기존 `/settings`의 share token 생성 UI 재노출)
- 모바일: `ScheduleActionBar`가 overflow 메뉴(⋯)로 자동 축약되거나 FAB + Sheet.
- `schedule/page.tsx` 내부의 inline 버튼 flex row 제거.

### A-3. 하이브리드 도움말 시스템 (이슈 13)

**전략:** 전역 드로워 + 인라인 i 버튼 하이브리드 (사용자 제안).

**변경:**
- `src/components/organisms/HelpDrawer.tsx` 신설 — 오른쪽 슬라이드 드로워. 목차:
  1. 시간표 작성 시작하기 (학생·과목 등록 → 세션 배치)
  2. 주간·월별·일별 뷰 사용법
  3. 템플릿 저장/적용
  4. PDF 출력
  5. 공유 링크 만들기
  6. 계정·초대(멀티 운영자)
- 각 항목은 MDX 컨텐츠로 작성하여 `src/content/help/*.mdx`에 분리 저장(번역/편집 편의).
- `TopBar`의 계정 메뉴 왼쪽에 글로벌 `?` 아이콘 버튼 배치 → 클릭 시 `HelpDrawer` 오픈.
- `src/components/molecules/HelpTooltip.tsx` 신설 — 인라인 i 버튼 primitive. 섹션 헤더 옆에 붙여 클릭 시 popover로 해당 섹션 설명 제공.
- 초기 배치 지점: `/schedule`의 ColorBy 토글 옆, 템플릿 버튼 옆, Day/Week/Month 토글 옆.
- 첫 방문 시 1회 spotlight (localStorage flag) — 핵심 동작 3가지를 순차 소개. 이후는 사용자가 `?` 버튼으로 직접 열도록.

### A-검증
- `mcp__playwright__*`로 AppShell 탐험:
  - 로그인 후 TopBar → 아바타 → 드롭다운 → 로그아웃 → `/login` 리디렉트 확인.
  - `/schedule`에서 Action Bar가 persistent하게 보이고 PDF/템플릿/공유 버튼이 모두 동작.
  - `?` 버튼 → HelpDrawer → 각 섹션 클릭 → 해당 컨텐츠 렌더.
- `computer-use`로 2차 시각 검증(드롭다운·드로워·spotlight 애니메이션).

---

## Phase P5-B — Design System Consistency

**포함 이슈:** 2, 3, 4, 6
**규모:** 3-4 PR
**의존성:** P5-A의 Action Bar 결정 후

### B-1. `SchedulePreview` primitive 추출 (이슈 3)

**현재 상태:** 랜딩 `page.tsx:84-218`의 `ScheduleMockup`은 실제 그리드와 무관한 하드코드 inline 컴포넌트.

**변경:**
- `src/components/common/SchedulePreview.tsx` 신설 — `TimeTableGrid`를 축약·정적 모드로 렌더. 더미 세션 데이터 주입 가능. `data-surface="surface"` 기본 적용.
- Landing `ScheduleMockup` → `<SchedulePreview data={DEMO_DATA} size="sm" />`로 대체.
- 동일 컴포넌트를 온보딩 페이지와 A-3 HelpDrawer의 "시간표 작성 시작하기" 항목에도 재활용.

### B-2. 모든 뷰에 Surface Mode 적용 (이슈 4)

**현재 상태:** `data-surface="surface"`가 `ScheduleGridSection.tsx:62`(주간 그리드)에만 적용. Daily/Monthly 뷰는 Admin 다크 토큰을 그대로 상속.

**변경:**
- `src/components/organisms/ScheduleDailyView.tsx`, `ScheduleMonthlyView.tsx`의 최상위 컨테이너에 `data-surface="surface"` 속성 추가.
- Daily 뷰 내부의 Tailwind 리터럴 색상(`bg-green-500`, `bg-yellow-400` 등) → CSS 변수 기반 subject 색상 토큰(예: `--color-subject-blue-bg`) 또는 `SessionBlock` 재사용으로 제거.
- Monthly 뷰 `MonthDayCell`이 쓰는 독자 subject 토큰 → 공통 subject 토큰으로 통일.

### B-3. 공통 `SubjectChip` primitive (이슈 4, 6)

**변경:**
- `src/components/common/SubjectChip.tsx` 신설 — Weekly `SessionBlock`의 축약본이자 Monthly/Daily/Landing이 공유할 "과목 칩" 원자.
- `MonthDayCell`, `ScheduleDailyView`, `SchedulePreview`가 `SubjectChip`을 기반으로 재작성.
- 이때 `SessionBlock`은 상호작용(드래그, 선택)까지 포함한 풀 버전으로 유지하고, 내부적으로 `SubjectChip`을 조합.

### B-4. 레거시 토큰 감사 (이슈 6)

**현재 상태:** `globals.css`에 `:root` 레거시 토큰과 `@theme` Phase 3 토큰이 병존.

**변경:**
- `:root` 블록의 변수 중 `@theme`에 대응되지 않는 것 리스트업.
- 더 이상 참조되지 않는 변수는 삭제. 참조가 남아있는 변수는 `@theme` 쪽 이름으로 치환 후 해당 소비 컴포넌트 수정.
- 타겟: `globals.css` 최종적으로 `@theme` + `[data-surface="surface"]` 두 블록만 남김.

### B-검증
- Landing → `/schedule` Week → Day → Month 순회하며 **동일한 Q Pastel 팔레트**로 과목 색이 렌더되는지 확인.
- 다크모드 토글 (Admin chrome만 다크, Surface는 항상 라이트) 동작 확인.
- `mcp__playwright__` 스크린샷 4장 (landing, week, day, month) 비교.
- `computer-use`로 색상·폰트·간격의 유기적 통일감 최종 판정.

---

## Phase P5-C — /schedule UX Polish

**포함 이슈:** 7, 8, 9, 11, 12b(고급 스코프)
**규모:** 3-4 PR
**의존성:** P5-A(Action Bar) + P5-B(공통 primitive) 완료 후

### C-1. 학생 리스트 패널 → 필터 UI로 전환 (이슈 7)

**현재 상태:** 데스크톱에서 floating `StudentPanel`이 그리드 오른쪽에 상주, 모바일에서는 BottomSheet. 사용자는 이게 항상 보이는 게 거슬린다고 판단.

**변경:**
- 기본 상태: 그리드 우측 패널 제거.
- `ColorBy === "student"`가 선택됐을 때만 그리드 상단/좌측에 "학생 필터 칩 strip" 노출. 칩 클릭 시 해당 학생만 하이라이트/필터.
- 학생 검색창은 칩 strip 내부로 통합(아이콘 버튼 → expand on click).
- 기존 `StudentPanelSection`은 제거, 로직만 `ScheduleHeader` 근처로 재배치.

### C-2. ColorBy 토글 시각 정합성 (이슈 8)

**현재 상태:** Day/Week/Month 토글은 선택된 항목이 Amber fill로 채워지지만, 과목/학생/강사 토글은 fill 없음 — 선택 가능 여부 자체가 불명확.

**변경:**
- `src/components/molecules/ColorByToggle.tsx` 재작성 — `ScheduleHeader`의 Day/Week/Month segmented button과 **동일한 스타일·동일한 primitive 사용**.
- 공통 `SegmentedButton` 컴포넌트 추출해서 두 토글 모두 소비하게 함.
- 활성 상태: Amber fill + 어두운 텍스트. 비활성: 투명 + hover 시 미약한 고리.

### C-3. 그룹수업 학생 필터 로직 정의 (이슈 9)

**결정된 로직:**
- 학생 필터는 **멀티 셀렉트**. 선택된 학생 집합을 `S`라 하자.
- 세션 블록 노출 규칙: `session.enrollments ∩ S ≠ ∅`면 블록 **전체** 표시(다른 학생도 포함).
- `S`가 비어있으면(아무도 선택 안 함) 전체 노출 — 기존 동작과 동일.
- `colorBy`가 `"student"`일 때, 색상은 "선택된 학생 중 첫 번째"의 학생 색상을 따르고, 나머지 학생이 있음을 표시하는 `+N` 뱃지를 블록 우상단에 부착.
- 그룹 수업에서 선택 학생과 비선택 학생이 함께 있을 때 시각 충돌을 피하기 위해, 블록 내부에는 선택 학생만 이름 표기, 비선택 학생은 호버/클릭 시 툴팁으로 확인.

**파일 변경:**
- `src/features/schedule/filters.ts` 신규 — `filterSessionsByStudents(sessions, selectedStudentIds)` 순수 함수.
- `SessionBlock`이 `colorBy === "student"`일 때 rendering 분기 — `+N` 뱃지 추가.
- 단위 테스트: 그룹 수업 경계 케이스 6종(전체 비선택 / 1명만 선택 / 그룹 내 2명 중 1명 선택 / 선택 학생이 소속된 세션 없음 / 모두 선택 / 선택 학생이 enrollments 없음) 회귀.

### C-4. 템플릿 affordance (이슈 11)

**변경:**
- 버튼 라벨 명확화: "현재 주를 템플릿으로 저장" / "저장된 템플릿 적용하기".
- A-3의 `HelpTooltip` 사용 — 템플릿 버튼 옆에 i 아이콘.
  - 텍스트: "반복되는 시간표를 저장해두고 다른 주에 동일한 배치를 한 번에 적용합니다. 예: 매주 같은 요일에 같은 학생이 같은 수업을 듣는 경우."
- 템플릿 적용 모달 내부에 "이 템플릿이 덮어쓸 대상 주" 프리뷰 블록 추가(기존 주의 세션이 삭제된다는 사실을 명시).

### C-5. PDF 고급 스코프 (이슈 12b 잔여분)

**변경 (선택적):**
- Action Bar의 PDF 버튼 클릭 시 간이 다이얼로그:
  - "현재 뷰만 출력" (기본)
  - "여러 주 범위 출력" — 주간 뷰 전용, 날짜 범위 선택
- 월별 뷰는 항상 "해당 월 전체" 단일 옵션.
- **주의:** 이 항목은 P5-C 스코프 중 가장 우선순위 낮음. 시간이 부족하면 Phase 6으로 이월 가능.

### C-검증
- `mcp__playwright__`로 `/schedule`에서:
  - 학생 필터 칩 토글 → 해당 학생 포함 세션만 남는지 확인.
  - 그룹 수업에서 1명만 선택 시 `+N` 뱃지 노출 확인.
  - Day/Week/Month 토글과 과목/학생/강사 토글 **같은 시각 스타일**인지 스크린샷 비교.
- `computer-use`로 드래그·애니메이션·hover 툴팁 검증.

---

## 페이즈 간 공통 규칙

### 브랜치·PR 전략
- 각 페이즈 = 별도 브랜치 `feat/phase5-{d|a|b|c}-{subtopic}`.
- 각 항목(D-1, A-1 등)을 독립 PR로 분리. `dev` 브랜치에 순차 머지.
- 페이즈 완결 후 `dev → main` 머지는 사용자 명시 요청 시에만.

### 문서 동기화 (각 PR 시)
- `tree.txt` 갱신.
- `ARCHITECTURE.md`에 신규 컴포넌트(AccountMenu, ScheduleActionBar, HelpDrawer, HelpTooltip, SchedulePreview, SubjectChip, SegmentedButton) 추가 반영.
- 새로운 아키텍처 결정이 생기면 `class-planner/docs/adr/` 하위에 ADR 작성.
- `TASKS.md`에 Phase 5 진척도 갱신.

### UI 검증 필수
Phase 5의 모든 페이즈는 `class-planner/src/**`에 해당되므로 `UI Verification Protocol` (Non-negotiable)에 따라:
1. Playwright MCP로 Golden path + 엣지 케이스 검증.
2. 시각적 변경이 있는 페이즈(A/B/C)는 computer-use로 2차 탐험 검증.
3. 최종 응답에 UI Verification Report 섹션 포함.

### 테스트 기준
- `npm run test`의 기존 테스트 100% 통과.
- 신규 로직(D-1의 `isEmptyData` 변경, C-3의 `filterSessionsByStudents`)은 신규 단위 테스트와 함께 머지.

---

## ⚠️ Known Risks & Alternatives

**Weaknesses:**
1. **페이즈 간 의존성 엄격** — D가 늦어지면 A/B/C가 줄줄이 밀림. 완화책: 페이즈 내부는 병렬 PR 가능.
2. **P5-B의 `:root` 제거가 광범위한 회귀 유발 가능** — 레거시 토큰에 의존하는 숨은 소비자 존재 가능. 완화책: B-4는 페이즈 내 마지막 PR로 두고 screenshot diff 비교.
3. **P5-C-1의 학생 패널 제거가 기존 사용자 학습 비용** — 기존 원장들은 늘 켜져있는 패널에 익숙. 완화책: 첫 사용자에게 A-3 spotlight로 필터 위치 안내.
4. **HelpDrawer 컨텐츠 유지보수 비용** — MDX 6건을 제품과 함께 계속 갱신해야 함. 완화책: 핵심 3건만 Phase 5에 포함, 나머지는 "Coming soon" placeholder.

**Rejected alternatives:**
- 13개 이슈를 한 번에 한 페이즈로 묶기 → PR 리뷰 폭탄, 회귀 추적 불가, 각 영역 설계의 전제가 섞여 의사결정 품질 저하.
- 학생 패널을 유지한 채 필터만 덧씌우기 → 두 필터 체계 공존으로 모바일 공간 고갈.
- PDF를 서버 사이드(puppeteer)로 이관 → 인프라 부담·비용 증가, Lightsail 마이그레이션 스코프 확대.

**Uncertainties:**
- `subset-font` 패키지의 CI Node 환경 호환성 — needs verification (D-2).
- `@orioncactus/pretendard` 배포본이 KS X 1001 커버 여부 — needs verification (D-2).
- 현재 `/schedule` Action 영역을 소비하는 모바일 제스처가 있는지 — needs verification (A-2).
- Phase 3에서 deferred된 "강사(Teacher) 뷰"와 P5-C의 ColorBy "강사" 분기 충돌 여부 — needs verification (C-2).

---

## Verification (End-to-End, 전 페이즈 완료 후)

1. 시크릿 브라우저 → `http://localhost:3000`
   - 랜딩 미리보기 그리드의 과목 칩 색상이 `/schedule` Week 뷰의 과목 칩 색상과 동일한지 육안 확인.
   - "무료로 시작하기" 클릭 → `/schedule` 진입 → 충돌 모달 없음.
2. TopBar → `?` 버튼 → HelpDrawer 오픈 → 6개 섹션 모두 렌더.
3. TopBar → 아바타 → 로그아웃 → `/login` 리디렉트.
4. Action Bar → PDF 다운로드 → Day/Week/Month 각각 한글 포함 PDF 정상.
5. Action Bar → 템플릿으로 저장 → i 버튼 툴팁 → 템플릿 적용 → 대상 주 프리뷰.
6. ColorBy → "학생" → 칩 strip 노출 → 특정 학생 선택 → 그룹 수업 블록에 `+N` 뱃지.
7. Day/Week/Month 토글, 과목/학생/강사 토글이 동일한 시각 스타일.
8. `computer-use`로 전체 페이지 스크롤 탐험하여 "따로 노는 느낌"이 사라졌는지 최종 판정.

---

## Post-approval 작업

1. 본 플랜을 `class-planner/docs/superpowers/specs/2026-04-17-phase5-stabilize-and-unify-design.md`로 이관(plan mode 종료 직후).
2. 각 페이즈별 implementation plan을 `superpowers:writing-plans`로 작성: P5-D부터 시작.
3. P5-D implementation plan 승인 후 구현 착수.
