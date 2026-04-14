# 컴포넌트 가이드

## 📋 개요

클래스 플래너 프로젝트의 **Atomic Design** 패턴과 컴포넌트 사용 방법을 설명합니다.

## 🏛️ Atomic Design 패턴

### 📦 Atoms (원자 컴포넌트)

**위치:** `src/components/atoms/`

**특징:**

- 가장 기본적인 UI 요소
- 재사용 가능한 최소 단위
- Props는 최소화

**예시:**

- `AuthGuard.tsx` - 인증 가드 컴포넌트
- `Button.tsx` - 버튼 컴포넌트
- `ErrorBoundary.tsx` - 에러 바운더리 컴포넌트
- `Input.tsx` - 입력 필드
- `Label.tsx` - 라벨
- `StudentListItem.tsx` - 학생 목록 아이템
- `SubjectListItem.tsx` - 과목 목록 아이템
- `ThemeToggle.tsx` - 테마 토글 컴포넌트

> `LoginButton.tsx`는 **Organisms**로 이동됨 (복잡한 상태 관리 포함).

### 🧬 Molecules (분자 컴포넌트)

**위치:** `src/components/molecules/`

**특징:**

- Atoms를 조합한 단위
- 특정 기능을 담당
- 재사용 가능한 기능 단위

**예시:**

- `ConfirmModal.tsx` - 확인 모달 (삭제 확인 등 이진 선택)
- `DataConflictModal.tsx` - 로그인 시 로컬/서버 데이터 충돌 해결 모달
- `DropZone.tsx` - 드래그 앤 드롭 영역 (시간표 셀)
- `PDFDownloadButton.tsx` - PDF 다운로드 버튼
- `ScheduleHeader.tsx` - 시간표 페이지 헤더
- `SessionBlock.tsx` - 세션 블록 (시간표 내 수업 표시)
- `SessionForm.tsx` - 수업 추가/수정 폼
- `StudentInputSection.tsx` - 학생 입력 섹션
- `StudentList.tsx` - 학생 목록
- `SubjectInputSection.tsx` - 과목 입력 섹션
- `SubjectList.tsx` - 과목 목록
- `TimeTableRow.tsx` - 시간표 행

> 각 컴포넌트의 Props와 동작 상세: [UI_SPEC.md § 3.2](../UI_SPEC.md#32-molecules-srccomponentsmolecules)

### 🦠 Organisms (유기체 컴포넌트)

**위치:** `src/components/organisms/`

**특징:**

- Molecules를 조합한 복합 컴포넌트
- 페이지의 주요 섹션을 담당
- 비즈니스 로직 포함 가능

**예시:**

- `AboutPageLayout.tsx` - 소개 페이지 레이아웃
- `LoginButton.tsx` - Nav bar 로그인 버튼 (Google OAuth 모달, 로그인 상태 드롭다운)
- `StudentManagementSection.tsx` - 학생 관리 섹션
- `StudentPanel.tsx` - 시간표 플로팅 학생 패널 (드래그 가능)
- `StudentsPageLayout.tsx` - 학생 페이지 레이아웃 (2열: 340px | 1fr)
- `SubjectManagementSection.tsx` - 과목 관리 섹션
- `SubjectsPageLayout.tsx` - 과목 페이지 레이아웃 (2열: 340px | 1fr)
- `TimeTableGrid.tsx` - 주간 시간표 그리드 (드래그앤드롭, 스크롤 보존, 가상 스크롤바)
- `about/FeatureCard.tsx`, `about/FeatureDetail.tsx`, `about/HeroSection.tsx` - 소개 페이지 섹션

### 🧩 Schedule 페이지 분리 컴포넌트 (app/schedule/\_components)

- `ScheduleHeader.tsx`: 스케줄 페이지 헤더/로딩/에러/설명
- `ScheduleGridSection.tsx`: `TimeTableGrid` 바인딩 섹션
- `StudentPanelSection.tsx`: `StudentPanel` 바인딩 섹션
- `PdfDownloadSection.tsx`: `PDFDownloadButton` 바인딩 섹션

### 🧪 Schedule 관련 헬퍼/훅

- `_utils/collisionHelpers.ts`: `isTimeOverlapping`
- `_utils/collisionQueries.ts`: `findCollidingSessions`, `checkCollisionsAtYPosition`
- `_utils/dndHelpers.ts`: DnD 헬퍼(학생 드래그 시작/종료, drop/세션드롭 빌더 등)
- `_utils/modalHandlers.ts`: 그룹/편집 모달 시간 변경 핸들러
- `_utils/editStudentHandlers.ts`: 편집 모달 학생 입력/추가 헬퍼
- `_utils/editSaveHandlers.ts`: 편집 모달 저장/삭제/취소 헬퍼
- `_hooks/useEditModalState.ts`: 편집 모달 상태 묶음
- `_hooks/useUiState.ts`: 드래그 상태, gridVersion

## 🎣 Custom Hooks (커스텀 훅)

**위치:** `src/hooks/`

**특징:**

- 재사용 가능한 로직
- 상태 관리 및 사이드 이펙트
- 컴포넌트 로직 분리

### 주요 훅들

#### **🌍 전역 데이터 초기화 훅**

**`useGlobalDataInitialization`**

- **위치**: `src/hooks/useGlobalDataInitialization.ts`
- **용도**: 로그인한 사용자의 모든 데이터를 초기화하고 기본 과목을 생성
- **사용 시점**: RootLayout에서 전역적으로 실행
- **특징**:
  - 로그인 후 전체 classPlannerData를 로컬스토리지로 가져옴
  - 과목이 없을 때만 기본 과목 자동 생성
  - 브라우저 독립적 동작 (Chrome, Firefox, Safari 등 모든 브라우저에서 동일)
  - 서버 기반 중복 방지 (Supabase 데이터베이스 기준)
  - Supabase Auth 보안 강화 (토큰 탈취 공격 방지)
  - 초기화 중 애니메이션 로딩 표시

#### **🚀 통합 데이터 관리 훅 (현행)**

**`useIntegratedDataLocal`**

- **위치**: `src/hooks/useIntegratedDataLocal.ts`
- **용도**: localStorage 기반 통합 데이터 관리 (Local-first)
- **사용 시점**: Schedule 페이지 등 students/subjects/sessions/enrollments 동시에 필요한 곳
- **특징**: localStorage를 SSOT로, 서버 동기화는 fire-and-forget (apiSync.ts)

#### **개별 데이터 관리 훅**

**`useStudentManagementLocal`**

- **위치**: `src/hooks/useStudentManagementLocal.ts`
- **용도**: 학생 CRUD (localStorage 즉시 반영 + 서버 동기화)

**`useSubjectManagementLocal`**

- **위치**: `src/hooks/useSubjectManagementLocal.ts`
- **용도**: 과목 CRUD (localStorage 즉시 반영 + 서버 동기화)

**`usePerformanceMonitoring`**

- **위치**: `src/hooks/usePerformanceMonitoring.ts`
- **용도**: 성능 모니터링 및 메트릭 수집
- **사용 시점**: 성능 측정이 필요한 컴포넌트

**`useUserTracking`**

- **위치**: `src/hooks/useUserTracking.ts`
- **용도**: 사용자 추적 및 분석 데이터 수집
- **사용 시점**: 사용자 행동 분석이 필요한 곳

**`useDisplaySessions`**

- **위치**: `src/hooks/useDisplaySessions.ts`
- **용도**: 세션 데이터를 화면에 표시하기 위한 필터링 및 정렬
- **사용 시점**: Schedule 페이지에서 세션 목록 표시

**`useStudentPanel`**

- **위치**: `src/hooks/useStudentPanel.ts`
- **용도**: 학생 패널의 상태 및 상호작용 관리
- **사용 시점**: Schedule 페이지의 학생 패널

**`useTimeValidation`**

- **위치**: `src/hooks/useTimeValidation.ts`
- **용도**: 시간 입력 검증 및 유틸리티 함수
- **사용 시점**: 세션 생성/편집 시 시간 검증

**`useLocal`**

- **위치**: `src/hooks/useLocal.ts`
- **용도**: UI 상태 및 캐시 데이터 관리
- **사용 시점**: 학생 선택 상태, 패널 위치, 테마 설정 등

### 훅 사용 시나리오별 가이드

#### **Schedule 페이지에서 (현행):**

```typescript
// ✅ 현행 사용법 - Local-first 통합 데이터 관리
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useStudentPanel } from "../../hooks/useStudentPanel";
import { useLocal } from "../../hooks/useLocal";

// 통합 데이터 관리 (localStorage 기반)
const { students, subjects, sessions, enrollments } = useIntegratedDataLocal();

// 세션 표시 로직
const { sessions: displaySessions } = useDisplaySessions(
  sessions,
  enrollments,
  selectedStudentId
);

// 학생 패널 관리
const studentPanelState = useStudentPanel(
  students,
  selectedStudentId,
  setSelectedStudentId
);

// UI 상태 관리 (localStorage 기반)
const [selectedStudentId, setSelectedStudentId] = useLocal(
  "ui:selectedStudent",
  ""
);
```

### 표시 규칙 (현행)

- 세션 셀 학생 이름 표시: 최대 8명까지 이름 표시, 초과 시 "외 N명" 형식으로 요약
  - 폰트 크기 동적 조정: 3명 이하 14px → 9명+ 5px
  - 구현 위치: `src/components/molecules/SessionBlock.tsx`
  - 관련 테스트: `src/components/molecules/__tests__/SessionBlock.utils.test.ts`, `tests/e2e/schedule-student-names.spec.ts`

### 시간 겹침/충돌 및 재배치 정책 (2025-09-22)

- 겹침 정의: `start1 < end2 && start2 < end1`
- 재배치 알고리즘: 이동 대상 세션의 목표 `yPosition`은 고정(anchor). 동일 y에서 겹치는 세션들을 아래 줄로 한 칸씩 이동시키며, 필요 시 연쇄적으로 전파(propagate).
- 호출 시점:
  - 세션 추가 직후
  - 세션 드래그 앤 드롭 이동 시
  - 수업 편집 모달에서 시간 저장 시
- 구현: `src/lib/sessionCollisionUtils.ts`의 `repositionSessions`
- 스케줄 페이지 연결:
  - 드래그 이동: `updateSessionPosition` → `repositionSessions`
  - 편집 저장: `updateSession` → `repositionSessions`
- 테스트:
  - `src/lib/__tests__/sessionCollisionUtils.test.ts` (드래그/편집 체인 전파 검증)

#### **개별 세션 관리:**

- `useScheduleSessionManagement.ts`: 세션 추가/수정/삭제 (localStorage + apiSync)
- `useScheduleDragAndDrop.ts`: 드래그앤드롭 이벤트 처리

## 📝 Types (타입 정의)

**위치:** `src/types/`, `src/shared/types/`

**특징:**

- 페이지별 타입 정의
- 인터페이스 및 타입 안정성
- 재사용 가능한 타입

**예시:**

- `scheduleTypes.ts` - 스케줄 관련 타입
- `studentsTypes.ts` - 학생 관련 타입
- `subjectsTypes.ts` - 과목 관련 타입

## 🎨 스타일링 가이드

### TailwindCSS 사용 원칙

1. **인라인 스타일 사용 금지**
2. **TailwindCSS 클래스 우선 사용**
3. **커스텀 값은 tailwind.config.ts에 등록**
4. **반응형 클래스 적절히 사용**
5. **상태 클래스 적절히 사용**

### 스타일링 체크리스트

#### **코드 작성 시**

- [ ] 인라인 스타일 사용하지 않음
- [ ] 모든 스타일이 `className`에 TailwindCSS 클래스로 작성됨
- [ ] 커스텀 값들은 `tailwind.config.ts`에 등록됨
- [ ] 반응형 클래스 (`md:`, `lg:` 등) 적절히 사용됨
- [ ] 상태 클래스 (`hover:`, `focus:` 등) 적절히 사용됨

#### **리뷰 시**

- [ ] 인라인 스타일이 없는지 확인
- [ ] TailwindCSS 클래스가 의미 있게 사용되었는지 확인
- [ ] 디자인 시스템과 일관성 있는지 확인
- [ ] 반응형 및 상태 대응이 적절한지 확인

## 🔧 컴포넌트 개발 가이드라인

### 1. 컴포넌트 설계 원칙

- **단일 책임 원칙**: 하나의 컴포넌트는 하나의 명확한 역할
- **재사용성**: 가능한 한 재사용 가능하게 설계
- **Props 최소화**: 필요한 Props만 전달
- **타입 안정성**: TypeScript를 활용한 타입 정의

### 2. 컴포넌트 구조

```typescript
// 컴포넌트 인터페이스 정의
interface ComponentProps {
  // Props 타입 정의
}

// 컴포넌트 구현
const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 상태 및 로직
  const [state, setState] = useState();

  // 이벤트 핸들러
  const handleEvent = () => {
    // 이벤트 처리 로직
  };

  // 렌더링
  return <div className="tailwind-classes">{/* 컴포넌트 내용 */}</div>;
};

export default Component;
```

### 3. 테스트 작성

- **단위 테스트**: 각 컴포넌트의 기본 동작 테스트
- **통합 테스트**: 컴포넌트 간 상호작용 테스트
- **접근성 테스트**: 스크린 리더 및 키보드 네비게이션 테스트

## 📚 관련 문서

- [UI_SPEC.md](../UI_SPEC.md) — UI 동작 소스 오브 트루스 (컴포넌트 Props, 페이지 레이아웃, 검증 라우트)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — 프로젝트 계층 구조
- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
