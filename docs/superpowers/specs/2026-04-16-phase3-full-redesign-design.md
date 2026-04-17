# Phase 3 풀 리디자인 — 통합 설계 스펙

> **상태:** Draft
> **날짜:** 2026-04-16
> **범위:** 시간표 그리드 UI, 학생/과목 관리 페이지, 모바일 반응형, PDF 엔진, SessionBlock 상태 레이어
> **전제:** Phase 3 Scope 1 (Token SSOT + CSS Module 이관 + 랜딩 리디자인) 완료 상태

---

## 1. 설계 결정 요약

| 항목 | 결정 |
|------|------|
| 디자인 수준 | 풀 리디자인 (토큰 적용 + 레이아웃 재배치 + 신규 컴포넌트 + 애니메이션) |
| PDF 방식 | jsPDF 직접 렌더링 (html2canvas 제거) |
| 모바일 전략 | 모바일 퍼스트 |
| 학생/과목 페이지 | Master-Detail 패턴 (인라인 편집 지원) |
| 모바일 시간표 | 하이브리드 토글 (일별/주간, Phase 4에서 월간 추가) |
| 아이콘 | Lucide React (스트로크 아이콘, 모던/우아한 디자인) |
| 네비게이션 | 모바일: 하단 탭 바 / 데스크톱: 좌측 아이콘 사이드바 |

---

## 2. App Shell + Navigation

### 2.1 아이콘 시스템
- **라이브러리:** `lucide-react` (tree-shakable, Next.js 호환)
- **스타일:** strokeWidth 1.5, size 20 (탭 바) / 24 (사이드바)
- **탭 매핑:**

| 탭 | Lucide 아이콘 | 라벨 |
|----|-------------|------|
| 시간표 | `CalendarDays` | 시간표 |
| 학생 | `Users` | 학생 |
| 과목 | `BookOpen` | 과목 |
| 강사 | `GraduationCap` | 강사 |
| 설정 | `Settings` | 설정 |

### 2.2 모바일 레이아웃 (< 768px)
```
┌─────────────────────────┐
│ TopBar (학원명 + 알림)   │  h: 48px
├─────────────────────────┤
│                         │
│    Page Content         │  flex: 1, overflow-y: auto
│    (safe-area 적용)     │
│                         │
├─────────────────────────┤
│ BottomTabBar (5탭)      │  h: 56px + safe-area-bottom
└─────────────────────────┘
```
- TopBar: 좌측 로고/학원명, 우측 알림 아이콘 (Phase 4 알림 연동 대비)
- BottomTabBar: 현재 탭 accent 색상 (`--color-primary`), 나머지 `--color-text-muted`
- Active 탭: 아이콘 + 라벨 표시, 비활성: 아이콘만

### 2.3 데스크톱 레이아웃 (≥ 768px)
```
┌────┬──────────────────────────┐
│    │                          │
│ S  │    Page Content          │
│ i  │    (max-width 제한 없음) │
│ d  │                          │
│ e  │                          │
│ b  │                          │
│ a  │                          │
│ r  │                          │
│    │                          │
│ 56 │                          │
│ px │                          │
└────┴──────────────────────────┘
```
- Sidebar: 56px 폭, 아이콘 + 호버 시 라벨 툴팁
- 하단에 설정 아이콘 (margin-top: auto)
- TopBar 숨김 (학원명은 사이드바 상단 로고로 대체)

### 2.4 Breakpoints
| 이름 | 값 | 용도 |
|------|-----|------|
| `sm` | 640px | 텍스트/간격 조정 |
| `md` | 768px | 모바일↔데스크톱 전환 (사이드바 등장) |
| `lg` | 1024px | 넓은 그리드, Master-Detail 분할 |

### 2.5 신규 컴포넌트
- `AppShell.tsx` (organisms) — 레이아웃 컨테이너, TopBar/BottomTabBar/Sidebar 조건 렌더링
- `BottomTabBar.tsx` (molecules) — 모바일 탭 바
- `Sidebar.tsx` (molecules) — 데스크톱 사이드바
- `TopBar.tsx` (molecules) — 모바일 상단 바

---

## 3. Schedule Grid 리디자인

### 3.1 하이브리드 토글
- **뷰 모드:** 일별 / 주간 (Phase 4에서 월간 추가)
- **기본값:** 모바일 → 일별, 데스크톱 → 주간
- **전환:** segmented control (`일별 | 주간`) — 데스크톱/모바일 동일 UI
- **상태 저장:** localStorage `ui:scheduleView` (subject와 동일 패턴)

### 3.2 일별 뷰 (모바일 기본)
```
┌─────────────────────────┐
│ [일별|주간]  ◀ 4월 15일 ▶ │  뷰 토글 + 날짜 네비게이션
├─────────────────────────┤
│ 월 화 [수] 목 금 토 일   │  요일 칩 바 (스크롤)
├─────────────────────────┤
│ 14:00  ┌──────────────┐ │
│        │ 수학         │ │  세로 리스트
│        │ 김민준       │ │  수업 블록 = 전체 너비 카드
│        │ 박지현 선생님│ │  시간 · 과목 · 학생 · 강사
│        └──────────────┘ │
│ 15:00  ┌──────────────┐ │
│        │ 영어 [진행중]│ │
│        │ 이서윤, 박지호│ │
│        └──────────────┘ │
├─────────────────────────┤
│  [+ 수업 추가] FAB      │  Floating Action Button
└─────────────────────────┘
```
- 요일 칩 바: 수평 스크롤, 현재 요일 accent 배경
- 수업 블록: 전체 너비 카드, 과목 accent 좌측 보더
- 빈 시간대: 표시하지 않음 (수업 있는 시간만 나열)
- 탭 → EditSessionModal (바텀시트), 롱프레스 → 삭제/이동 옵션
- FAB: 우하단 고정, 수업 추가 모달 열기

### 3.3 주간 뷰 (데스크톱 기본)
- 현재 TimeTableGrid 구조 유지하되 Phase 3 토큰 적용
- 요일 헤더: accent 강조 (오늘), 날짜 표시 추가
- 시간 컬럼: 30분 슬롯 유지
- SessionBlock: 상태 레이어 적용 (§5)
- 드래그앤드롭: 데스크톱 전용 (모바일은 탭/롱프레스)
- 모바일에서 주간 뷰 선택 시: 현재와 동일한 가로 스크롤 그리드 (축소 버전)

### 3.4 ScheduleHeader 리디자인
- 좌측: 뷰 토글 (segmented control)
- 중앙: 날짜/주차 표시 + 이전/다음 네비게이션
- 우측: ColorBy 토글, PDF 다운로드, StudentPanel 토글
- 모바일: 2줄 레이아웃 (1줄 뷰토글+날짜, 2줄 액션 버튼)

### 3.5 모달 모바일 대응
- 데스크톱: 중앙 모달 (현재와 동일)
- 모바일 (< 768px): **바텀시트** 패턴
  - 하단에서 슬라이드업
  - 드래그 핸들 (상단 바)
  - 스와이프 다운으로 닫기
  - `max-height: 85vh`, overflow-y: auto

### 3.6 터치 제스처 (모바일)
| 제스처 | 동작 |
|--------|------|
| 좌/우 스와이프 | 요일 전환 (일별 뷰) |
| 탭 | 수업 상세 → EditSessionModal (바텀시트) |
| 롱프레스 | 컨텍스트 메뉴 (편집/삭제/이동) |
| FAB 탭 | 수업 추가 모달 |

---

## 4. 학생/과목 관리 페이지 리디자인

### 4.1 Student 데이터 모델 확장

**신규 필드 (DB + Domain + UI):**

| 필드 | 도메인 타입 | DB 컬럼 | DB 타입 | 필수 |
|------|-----------|---------|---------|------|
| `grade` | `string?` | `grade` | `TEXT` | No |
| `school` | `string?` | `school` | `TEXT` | No |
| `phone` | `string?` | `phone` | `TEXT` | No |

**기존 필드 정비:**
- `gender`: 도메인에 존재하나 localStorage CRUD에서 미사용 → 정비
- `birthDate`: 도메인에 존재하나 localStorage CRUD에서 미사용 → 정비
- `DomainTypes.ts` `Student` 인터페이스에 `birthDate` 누락 → 추가

**마이그레이션:**
```sql
-- 025_add_student_profile_fields.sql
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
```

**도메인 엔티티 변경:**
- `Student.create(name, options?)` — options: `{ gender?, birthDate?, grade?, school?, phone? }`
- `Student.restore(...)` — 모든 필드 포함
- `changeProfile(updates)` — 이름 외 프로필 필드 일괄 변경 메서드 추가
- 유효성 검증: phone은 한국 전화번호 형식 (`010-XXXX-XXXX` 또는 숫자만)

**localStorage CRUD 정비:**
- `addStudentToLocal(name, options?)` — gender, birthDate, grade, school, phone 저장
- `updateStudentInLocal(id, updates)` — 모든 프로필 필드 업데이트 지원

### 4.2 Master-Detail 레이아웃

**데스크톱 (≥ 1024px):**
```
┌──────────────┬──────────────────────────────┐
│ 목록 패널     │ 상세 패널                     │
│ (360px)      │ (flex: 1)                    │
│              │                              │
│ 🔍 검색      │ ┌───────────────────────────┐ │
│ ────────     │ │ 김민준        [편집] [삭제]│ │
│ ● 김민준  ▸  │ │ 중3 · ○○중학교            │ │
│   이서윤     │ ├───────────────────────────┤ │
│   박지호     │ │ 📊 요약                   │ │
│   최예은     │ │ 등록과목: 2  주간수업: 4회 │ │
│              │ ├───────────────────────────┤ │
│ [+ 학생추가] │ │ 📅 수업 일정              │ │
│              │ │ 월 14:00 수학 박지현T      │ │
│              │ │ 화 14:00 수학 박지현T      │ │
│              │ │ 화 15:00 영어 김영수T      │ │
│              │ ├───────────────────────────┤ │
│              │ │ 📋 프로필                 │ │
│              │ │ 전화번호: 010-1234-5678   │ │
│              │ │ 학교: ○○중학교            │ │
│              │ │ 학년: 중3                 │ │
│              │ │ 성별: 남                  │ │
│              │ │ 생년월일: 2013-03-15      │ │
│              │ └───────────────────────────┘ │
└──────────────┴──────────────────────────────┘
```

**모바일 (< 1024px):**
- 목록 전체 화면 → 학생 탭 → 상세 전체 화면 (뒤로 버튼)
- 상세 페이지: 편집 버튼 탭 → 인라인 편집 모드 전환
- 애니메이션: 좌→우 슬라이드 전환

### 4.3 상세 패널 섹션

**섹션 1 — 헤더:**
- 학생 이름 (큰 글씨), 학년 · 학교 (서브텍스트)
- 아바타: 성(姓) 첫 글자 + 과목 accent 배경
- 편집/삭제 버튼 (Lucide: `Pencil`, `Trash2`)

**섹션 2 — 요약 카드:**
- 등록 과목 수, 주간 수업 횟수 (2칸 그리드)
- 숫자 강조 (accent 색상, 큰 폰트)

**섹션 3 — 수업 일정:**
- 요일별 수업 리스트 (시간, 과목명, 강사명)
- 수업 블록 탭 → 시간표 해당 수업으로 이동

**섹션 4 — 프로필:**
- 전화번호, 학교, 학년, 성별, 생년월일
- 인라인 편집 모드: 각 필드가 입력 필드로 전환
- 저장/취소 버튼

### 4.4 인라인 편집
- 편집 버튼 탭 → 프로필 섹션 필드들이 input으로 전환
- 저장 시: 도메인 유효성 검증 → localStorage 업데이트 → fire-and-forget 서버 동기화
- Local-first 패턴 유지 (즉시 반영, 비동기 서버 동기화)

### 4.5 과목 페이지
- 동일한 Master-Detail 구조
- 상세 패널: 과목명, 색상, 등록 학생 목록, 주간 수업 일정
- 과목 색상 편집: 컬러 피커 (과목 accent palette에서 선택)

### 4.6 목록 아이템 디자인
- 아바타 (성 첫 글자 + accent 배경)
- 이름 (bold)
- 서브텍스트: 등록 과목명 · 주간 수업 횟수
- 선택 상태: 좌측 accent 보더 + 배경 하이라이트
- 스와이프 삭제 (모바일)

---

## 5. SessionBlock 상태 레이어

Phase 3 디자인 시스템 스펙 §4에서 정의된 상태 구현:

| 상태 | 시각 효과 | 트리거 |
|------|----------|--------|
| 기본 | 과목 accent 좌측 보더 (3px), 반투명 accent 배경 | - |
| 호버 | `translateY(-2px)` + `box-shadow: 0 4px 12px` | 마우스 호버 (데스크톱) |
| 진행 중 | accent 보더 강화 + `[진행중]` 뱃지 + 미세 glow | 현재 시간이 수업 시간 범위 내 |
| 완료 | `opacity: 0.55` | 현재 시간이 수업 종료 시간 이후 |
| 드래그 | `scale(0.95)` + `box-shadow: 0 8px 20px` + `cursor: grabbing` | 드래그 중 (데스크톱) |
| 충돌 | 좌측 보더 빨간색 (`#EF4444`) + ⚠️ 아이콘 | 시간대 겹침 감지 |
| 포커스 | `outline: 2px solid var(--color-primary)` | 키보드 Tab 포커스 |

**진행 중/완료 판단 로직:**
- `useSessionStatus(startTime, endTime)` 훅 신규 생성
- 1분 간격 타이머로 현재 시간 대비 상태 계산
- 일별 뷰에서만 활성화 (주간 뷰는 정보 밀도상 뱃지 생략, opacity만 적용)

---

## 6. PDF 엔진 교체 (jsPDF 직접 렌더링)

### 6.1 아키텍처
```
SessionData[] → PdfRenderer → jsPDF API → Blob → download
```
- `html2canvas` 의존성 제거
- `jsPDF` API로 텍스트, 도형, 선을 직접 그려 벡터 PDF 생성
- 한글 폰트: Pretendard `.ttf` 서브셋을 jsPDF에 등록

### 6.2 레이아웃 (A4 가로)
```
┌─────────────────────────────────────────────────┐
│ 학원이름 시간표          김민준 개인 시간표       │ 헤더
│ 2026년 4월 3주차         출력일: 2026-04-16      │
├─────────────────────────────────────────────────┤
│      │  월   │  화   │  수   │  목   │  금     │
│ 14:00│ 수학  │ 수학  │       │ 영어  │         │ 그리드
│      │ 김민준│ 김민준│       │ 이서윤│         │
│ 15:00│ 영어  │ 영어  │ 국어  │ 수학  │ 수학    │
│      │ 2명   │ 2명   │ 최예은│ 정하윤│ 김민준  │
├─────────────────────────────────────────────────┤
│ CLASS PLANNER            class-planner.info365   │ 푸터
└─────────────────────────────────────────────────┘
```

### 6.3 PDF 변형
| 변형 | 내용 | 파일명 패턴 |
|------|------|-----------|
| 전체 시간표 | 학원 전체 수업 그리드 | `{학원명}_전체시간표.pdf` |
| 학생별 | 특정 학생 수업만 필터 | `{학생명}_시간표.pdf` |
| 강사별 | 특정 강사 수업만 필터 | `{강사명}_시간표.pdf` |

### 6.4 Surface 라이트 테마 강제
- PDF는 항상 Surface 라이트 모드로 렌더링 (인쇄 최적화)
- 과목별 accent: Surface Pastel 색상 사용 (밝은 배경 + 진한 좌측 보더)

### 6.5 신규 모듈 구조
```
src/lib/pdf/
├── PdfRenderer.ts          -- jsPDF 기반 렌더러 (엔트리)
├── PdfGridLayout.ts        -- 그리드 좌표 계산
├── PdfSessionBlock.ts      -- 수업 블록 드로잉
├── PdfHeader.ts            -- 헤더/푸터 드로잉
└── fonts/
    └── pretendard-subset.ts -- Base64 인코딩 폰트 서브셋
```
- 기존 `src/lib/pdf-utils.ts` (991줄) 삭제
- `PDFDownloadButton.tsx`에서 새 `PdfRenderer` import

---

## 7. 모바일 퍼스트 파운데이션

### 7.1 터치 타겟
- 최소 44×44px (WCAG 기준)
- SessionBlock: 최소 높이 44px (현재보다 확대)
- 모든 interactive 요소에 적용

### 7.2 Safe Area
- `env(safe-area-inset-bottom)`: BottomTabBar에 적용
- `env(safe-area-inset-top)`: TopBar에 적용
- 노치/Dynamic Island 대응

### 7.3 바텀시트 컴포넌트
- `BottomSheet.tsx` (molecules) — 범용 바텀시트
- Props: `isOpen`, `onClose`, `title`, `children`
- 기능: 드래그 핸들, 스와이프 다운 닫기, 백드롭, `max-height: 85vh`
- 애니메이션: CSS `transform: translateY()` + `transition`
- EditSessionModal, GroupSessionModal 등이 모바일에서 BottomSheet로 래핑

### 7.4 반응형 전환 전략
| 요소 | 모바일 (< 768px) | 태블릿 (768–1023px) | 데스크톱 (≥ 1024px) |
|------|-----------------|--------------------|--------------------|
| Navigation | BottomTabBar | Sidebar | Sidebar |
| TopBar | 표시 | 숨김 | 숨김 |
| Schedule 기본 뷰 | 일별 | 주간 | 주간 |
| 모달 | 바텀시트 | 중앙 모달 | 중앙 모달 |
| Master-Detail | 전체화면 전환 | 전체화면 전환 | 좌우 분할 (lg) |
| StudentPanel | 바텀시트 | 고정 사이드 패널 | 고정 사이드 패널 |
| 드래그앤드롭 | 비활성 (롱프레스) | 활성 | 활성 |

---

## 8. 디자인 토큰 적용 범위

기존 Phase 3 토큰 (`globals.css @theme`)을 남은 페이지에 적용:

### Admin 모드 (관리 영역)
- `--color-bg-primary`, `--color-bg-secondary`: 페이지/카드 배경
- `--color-primary` (Amber #FBBF24): 액센트, 활성 탭, FAB
- `--color-text-primary`, `--color-text-muted`: 텍스트 계층
- `--color-border`: 구분선, 카드 외곽

### Surface 모드 (시간표 그리드)
- `data-surface="surface"` 속성으로 스코프
- Q Pastel 색상: 과목별 고유 pastel 배경
- 밝은 톤: 인쇄 친화적

---

## 9. 영향 범위

### 신규 파일
| 파일 | 타입 | 설명 |
|------|------|------|
| `AppShell.tsx` | organism | 레이아웃 컨테이너 |
| `BottomTabBar.tsx` | molecule | 모바일 탭 바 |
| `Sidebar.tsx` | molecule | 데스크톱 사이드바 |
| `TopBar.tsx` | molecule | 모바일 상단 바 |
| `BottomSheet.tsx` | molecule | 바텀시트 컴포넌트 |
| `StudentDetailPanel.tsx` | organism | 학생 상세 패널 |
| `SubjectDetailPanel.tsx` | organism | 과목 상세 패널 |
| `ScheduleDailyView.tsx` | organism | 일별 시간표 뷰 |
| `DayChipBar.tsx` | molecule | 요일 칩 바 |
| `useScheduleView.ts` | hook | 뷰 모드 관리 |
| `useSessionStatus.ts` | hook | 수업 진행 상태 판단 |
| `useBottomSheet.ts` | hook | 바텀시트 제스처 |
| `src/lib/pdf/PdfRenderer.ts` | lib | PDF 렌더러 |
| `src/lib/pdf/PdfGridLayout.ts` | lib | PDF 그리드 레이아웃 |
| `src/lib/pdf/PdfSessionBlock.ts` | lib | PDF 수업 블록 |
| `src/lib/pdf/PdfHeader.ts` | lib | PDF 헤더/푸터 |
| `025_add_student_profile_fields.sql` | migration | 학생 프로필 필드 추가 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `Student.ts` | grade, school, phone 필드 추가, changeProfile() 메서드 |
| `DomainTypes.ts` | birthDate, grade, school, phone 추가 |
| `planner.ts` | Student 타입에 grade, school, phone 추가 |
| `localStorageCrud.ts` | 학생 CRUD에 전체 프로필 필드 지원 |
| `SupabaseStudentRepository.ts` | 신규 필드 매핑 |
| `interfaces.ts` | StudentRepository 인터페이스 확장 |
| `apiSync.ts` | syncStudentCreate/Update에 프로필 필드 포함 |
| `SessionBlock.tsx` | 상태 레이어 CSS 추가 |
| `TimeTableGrid.tsx` | 뷰 토글 로직, 일별 뷰 조건 렌더링 |
| `ScheduleHeader.tsx` | 리디자인 (뷰 토글 + 날짜 네비게이션) |
| `StudentsPageLayout.tsx` | Master-Detail 레이아웃 |
| `SubjectsPageLayout.tsx` | Master-Detail 레이아웃 |
| `EditSessionModal.tsx` | 모바일 바텀시트 래핑 |
| `GroupSessionModal.tsx` | 모바일 바텀시트 래핑 |
| `StudentPanel.tsx` | 모바일 바텀시트 전환 |
| `layout.tsx` | AppShell 적용 |
| `globals.css` | 반응형 breakpoint 확장, 바텀시트 스타일 |
| `middleware.ts` | /teacher-schedule 외 라우트 가드 유지 |

### 삭제 파일
| 파일 | 사유 |
|------|------|
| `src/lib/pdf-utils.ts` | jsPDF 직접 렌더링으로 교체 |

---

## 10. 구현 순서 (권장)

| Step | 범위 | 의존성 |
|------|------|--------|
| 1 | Student 데이터 모델 확장 (도메인 + DB + CRUD 정비) | 없음 |
| 2 | App Shell + Navigation (Lucide 아이콘, TopBar, BottomTabBar, Sidebar) | 없음 |
| 3 | 학생/과목 Master-Detail 페이지 | Step 1, 2 |
| 4 | BottomSheet 컴포넌트 + 모달 모바일 대응 | Step 2 |
| 5 | Schedule 일별 뷰 + 하이브리드 토글 | Step 2, 4 |
| 6 | SessionBlock 상태 레이어 | 없음 |
| 7 | Schedule Grid 반응형 + 터치 제스처 | Step 4, 5, 6 |
| 8 | PDF 엔진 교체 (jsPDF 직접 렌더링) | 없음 |
| 9 | 전체 페이지 토큰 적용 + 시각적 폴리시 | Step 2, 3, 5 |
| 10 | 통합 테스트 + UI 검증 | 전체 |

---

## 11. 검증 방법

### 자동 검증
- `npx vitest run` — Student 도메인 테스트, 기존 테스트 regression
- `npm run check:quick` — tsc + lint + unit
- `npm run build` — 프로덕션 빌드 확인

### 수동 검증 (Playwright MCP)
- 모바일 뷰포트 (375×667): 모든 페이지 네비게이션, 바텀시트 동작
- 데스크톱 뷰포트 (1280×800): Master-Detail, 사이드바, 드래그
- PDF 다운로드: 벡터 텍스트 선명도, 한글 깨짐 없음
- 일별↔주간 뷰 전환

### computer-use 검증 (시각적 변경)
- 모달 바텀시트 슬라이드 애니메이션
- 스와이프 제스처 동작
- 반응형 전환 (브라우저 리사이즈)
- SessionBlock 호버/드래그 상태
- 아이콘 시각적 품질
