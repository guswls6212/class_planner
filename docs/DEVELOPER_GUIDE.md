# 개발자 가이드

## 📋 개요

이 문서는 클래스 플래너 프로젝트의 개발자를 위한 종합 가이드입니다. **Next.js + Atomic Design + Clean Architecture** 구조를 기반으로 한 프로젝트 구조, 개발 프로세스, 에러 방지 방법 등을 포함합니다.

---

## 🏗️ 프로젝트 구조

### 📁 디렉토리 구조 (Next.js + Atomic Design + Clean Architecture)

```
class-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 라우트 (Clean Architecture 통합)
│   │   │   ├── data/          # 🆕 통합 데이터 관리 API (JSONB 기반)
│   │   │   ├── students/      # 학생 관리 API (개별 CRUD)
│   │   │   ├── subjects/      # 과목 관리 API (개별 CRUD)
│   │   │   └── sessions/      # 세션 관리 API (개별 CRUD)
│   │   ├── students/          # 학생 페이지
│   │   ├── subjects/          # 과목 페이지
│   │   ├── schedule/          # 시간표 페이지
│   │   ├── manual/            # 매뉴얼 페이지
│   │   ├── layout.tsx         # 루트 레이아웃 (네비게이션 포함)
│   │   ├── page.tsx           # 홈페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # Atomic Design 컴포넌트
│   │   ├── atoms/            # 원자 컴포넌트 (Button, Input, Label 등)
│   │   ├── molecules/        # 분자 컴포넌트 (FormField, SessionBlock 등)
│   │   └── organisms/        # 유기체 컴포넌트 (TimeTableGrid, StudentPanel 등)
│   ├── domain/               # Clean Architecture - Domain 계층
│   │   ├── entities/         # 도메인 엔티티 (Student, Subject, Session)
│   │   ├── value-objects/    # 값 객체 (StudentId, SubjectId, Color)
│   │   ├── repositories/     # 리포지토리 인터페이스
│   │   ├── services/         # 도메인 서비스
│   │   └── events/           # 도메인 이벤트
│   ├── application/          # Clean Architecture - Application 계층
│   │   ├── services/         # 애플리케이션 서비스
│   │   ├── use-cases/        # 유스케이스
│   │   ├── mappers/          # 데이터 매퍼
│   │   └── repositories/     # 리포지토리 인터페이스
│   ├── infrastructure/       # Clean Architecture - Infrastructure 계층
│   │   ├── repositories/     # Supabase 리포지토리 구현
│   │   ├── interfaces.ts     # 인터페이스 정의
│   │   └── RepositoryFactory.ts # 리포지토리 팩토리
│   ├── shared/               # 공유 타입 및 유틸리티
│   │   └── types/           # 공통 타입 정의
│   ├── hooks/                # 커스텀 훅 (레거시 호환)
│   ├── contexts/             # React Context (ThemeContext)
│   ├── lib/                  # 유틸리티 함수
│   └── utils/                # API 클라이언트 및 유틸리티
├── docs/                     # 프로젝트 문서
│   ├── DEVELOPER_GUIDE.md    # 개발자 가이드
│   ├── SUPABASE_JSONB_GUIDE.md # Supabase 가이드
│   └── ENVIRONMENT_SETUP.md  # 환경 설정 가이드
├── public/                   # 정적 파일
├── .env.local               # 환경 변수 (Next.js 방식)
├── next.config.ts           # Next.js 설정
├── package.json             # 프로젝트 의존성
├── tsconfig.json            # TypeScript 설정
└── vitest.config.ts         # 테스트 설정
```

### 🎯 주요 페이지 및 컴포넌트 구조

#### **Students 페이지** (`/students`)

**파일 구조:**

- `src/app/students/page.tsx` - Next.js App Router 페이지 컴포넌트
- `src/hooks/useStudentManagement.ts` - 학생 CRUD 로직 (레거시 호환)
- `src/hooks/useStudentManagementClean.ts` - Clean Architecture 기반 학생 관리
- `src/hooks/useSubjectInitialization.ts` - 과목 초기화 로직
- `src/hooks/useLocal.ts` - localStorage 관리
- `src/shared/types/studentsTypes.ts` - 학생 관련 타입 정의
- `src/components/organisms/StudentsPageLayout.tsx` - 페이지 레이아웃
- `src/components/organisms/StudentManagementSection.tsx` - 학생 관리 섹션
- `src/application/services/StudentApplicationService.ts` - 애플리케이션 서비스
- `src/domain/entities/Student.ts` - 도메인 엔티티

**주요 기능:**

- 학생 관리 (추가, 삭제, 선택)
- 기본 과목 자동 생성
- localStorage 데이터 저장/복원
- 학생 목록 카드 배경색 통일 (과목 네비게이션과 일치)
- 학생 이름 입력창 검색 기능 통합
- Clean Architecture 패턴 적용

#### **Subjects 페이지** (`/subjects`)

**파일 구조:**

- `src/app/subjects/page.tsx` - Next.js App Router 페이지 컴포넌트
- `src/hooks/useSubjectManagement.ts` - 과목 CRUD 로직 (레거시 호환)
- `src/hooks/useSubjectManagementClean.ts` - Clean Architecture 기반 과목 관리
- `src/hooks/useGlobalSubjects.ts` - 전역 과목 상태 관리
- `src/shared/types/subjectsTypes.ts` - 과목 관련 타입 정의
- `src/components/organisms/SubjectsPageLayout.tsx` - 페이지 레이아웃
- `src/components/organisms/SubjectManagementSection.tsx` - 과목 관리 섹션
- `src/components/molecules/SubjectInputSection.tsx` - 과목 입력 섹션
- `src/components/molecules/SubjectList.tsx` - 과목 목록
- `src/components/atoms/SubjectListItem.tsx` - 과목 아이템
- `src/application/services/SubjectApplicationService.ts` - 애플리케이션 서비스
- `src/domain/entities/Subject.ts` - 도메인 엔티티

**주요 기능:**

- 과목 관리 (추가, 삭제, 편집, 선택)
- 색상 선택 기능
- 실시간 검색 기능
- localStorage 데이터 저장/복원
- 학생 네비게이션과 일치하는 디자인
- Clean Architecture 패턴 적용

#### **Schedule 페이지** (`/schedule`)

**파일 구조:**

- `src/app/schedule/page.tsx` - Next.js App Router 페이지 컴포넌트
- `src/app/schedule/Schedule.module.css` - 페이지 전용 스타일
- `src/hooks/useDisplaySessions.ts` - 세션 표시 로직
- `src/hooks/useStudentPanel.ts` - 학생 패널 상태 관리
- `src/hooks/useTimeValidation.ts` - 시간 검증 로직
- `src/shared/types/scheduleTypes.ts` - 스케줄 관련 타입 정의
- `src/components/organisms/StudentPanel.tsx` - 학생 패널 컴포넌트
- `src/components/molecules/PDFDownloadButton.tsx` - PDF 다운로드 버튼
- `src/application/services/SessionApplicationService.ts` - 애플리케이션 서비스
- `src/domain/entities/Session.ts` - 도메인 엔티티

**주요 기능:**

- 시간표 표시 (9:00-23:00, 30분 단위)
- 드래그 앤 드롭으로 수업 추가
- 수업 편집 및 삭제
- 학생별 필터링
- PDF 다운로드
- 로그인 기능 제거 (전역 네비게이션으로 이동)
- Clean Architecture 패턴 적용

#### **Manual 페이지** (`/manual`)

- `src/app/manual/page.tsx` - Next.js App Router 페이지 컴포넌트
- 사용자 매뉴얼 표시
- 배포 상태 확인

### 🔧 백엔드 및 배포 구조

#### **Next.js API Routes** (`src/app/api/`)

**파일 구조:**

- `src/app/api/data/route.ts` - 🆕 통합 데이터 관리 API (JSONB 기반)
- `src/app/api/students/route.ts` - 학생 관리 API (GET, POST, PUT, DELETE)
- `src/app/api/subjects/route.ts` - 과목 관리 API (GET, POST, PUT, DELETE)
- `src/app/api/sessions/route.ts` - 세션 관리 API (GET, POST, PUT, DELETE)
- `src/infrastructure/RepositoryFactory.ts` - 리포지토리 팩토리
- `src/application/services/` - 애플리케이션 서비스 계층

**주요 기능:**

- Next.js App Router API Routes
- Clean Architecture 패턴 적용
- Supabase JSONB 데이터베이스 연동
- TypeScript 기반 타입 안정성
- 환경 변수 기반 설정 (`process.env.NEXT_PUBLIC_`)
- 의존성 주입을 통한 테스트 가능한 구조
- **JSONB 기반 통합 데이터 관리** (성능 최적화)

#### **🚀 JSONB 기반 통합 데이터 관리 시스템**

**개요:**
Schedule 페이지에서 students, subjects, sessions 정보가 모두 필요한 경우, 개별 API 호출 대신 JSONB 구조를 활용한 통합 데이터 관리로 성능을 최적화했습니다.

**파일 구조:**

- `src/app/api/data/route.ts` - 통합 데이터 API Routes (GET, PUT)
- `src/application/services/DataApplicationService.ts` - 통합 데이터 애플리케이션 서비스
- `src/hooks/useIntegratedData.ts` - 통합 데이터 관리 훅

**JSONB 데이터 구조:**

```json
{
  "version": "1.0",
  "students": [
    { "id": "student-1", "name": "김철수" },
    { "id": "student-2", "name": "이영희" }
  ],
  "subjects": [
    { "id": "subject-1", "name": "수학", "color": "#ff0000" },
    { "id": "subject-2", "name": "영어", "color": "#0000ff" }
  ],
  "sessions": [
    { "id": "session-1", "startsAt": "09:00", "endsAt": "10:00", "weekday": 0 }
  ],
  "enrollments": [
    { "id": "enrollment-1", "studentId": "student-1", "subjectId": "subject-1" }
  ],
  "lastModified": "2024-01-01T00:00:00.000Z"
}
```

**성능 개선 효과:**

- **API 호출 수**: 3회 → 1회 (66% 감소)
- **네트워크 요청**: 3번 → 1번 (66% 감소)
- **데이터 일관성**: 각각 다른 시점 → 동일한 시점 (100% 보장)
- **응답 시간**: 개별 호출 합계 → 단일 호출 (단축)

**사용법:**

```typescript
// Schedule 페이지에서 통합 데이터 훅 사용
const {
  data: { students, subjects, sessions, enrollments },
  loading,
  error,
  updateData,
} = useIntegratedData();

// 세션 추가 (통합 데이터 업데이트 방식)
const addSession = useCallback(
  async (sessionData: any) => {
    const newSessions = [
      ...sessions,
      { ...sessionData, id: crypto.randomUUID() },
    ];
    await updateData({ sessions: newSessions });
  },
  [sessions, updateData]
);
```

**API Routes:**

- `GET /api/data` - 전체 사용자 데이터 조회
- `PUT /api/data` - 전체 사용자 데이터 업데이트

#### **인증 및 로그인 시스템**

**파일 구조:**

- `src/app/login/page.tsx` - 전용 로그인 페이지
- `src/app/login/Login.module.css` - 로그인 페이지 스타일
- `src/components/atoms/AuthGuard.tsx` - 인증 가드 컴포넌트
- `src/components/atoms/LoginButton.tsx` - 로그인 버튼 컴포넌트 (레거시)
- `src/components/atoms/LoginButton.module.css` - 로그인 버튼 스타일
- `src/components/molecules/DataSyncModal.tsx` - 데이터 동기화 모달 (사용자 중심 로직)
- `src/components/molecules/UpgradeModal.tsx` - 유료 전환 유도 모달
- `src/hooks/useDataSync.ts` - 데이터 동기화 로직 (사용자 중심 개선)
- `src/hooks/useFeatureGuard.ts` - 기능 제한 및 업그레이드 유도
- `src/hooks/useStaleWhileRevalidate.ts` - 캐시 전략 구현
- `src/hooks/useDebouncedSave.ts` - DB 쓰기 최적화
- `src/types/dataSyncTypes.ts` - 데이터 동기화 타입 정의 (새로운 시나리오)
- `src/lib/dataSyncUtils.ts` - 데이터 동기화 유틸리티 (개선됨)
- `src/lib/debounceUtils.ts` - Debounce 유틸리티
- `src/utils/supabaseClient.ts` - Supabase 클라이언트 설정 (개선됨)

**주요 기능:**

- **전용 로그인 페이지** (`/login`)
- **페이지별 인증 가드**: 메인페이지만 로그인 없이 접근 가능
- **소셜 로그인 지원**:
  - Google OAuth 로그인 (완전 자동화 지원)
  - Kakao OAuth 로그인 (준비됨)
  - **향후 확장 계획**: 이메일 인증코드 로그인
- **사용자 중심 데이터 동기화 시나리오 처리**:
  - `localOnlyFirstLogin`: 로컬 데이터만 있는 첫 로그인 (Import data vs Start fresh)
  - `localAndServerConflict`: 로컬과 서버 데이터 충돌 (Device data vs Server data)
  - `normalLogin`: 일반 로그인 (데이터 없음)
  - `noData`: 데이터 없음
- **사용자 선택 후에만 로컬 데이터 삭제** (데이터 보호 강화)
- 유료 기능 제한 (무료: 학생 10명, 유료: 무제한)
- Stale-While-Revalidate 캐시 전략
- Debounced DB 쓰기 작업
- React.memo를 활용한 성능 최적화
- **자동화된 테스트 시스템** (`auto-fix-test.js`, `analyze-results.js`)
- **getSession 타임아웃 처리** (5초 타임아웃으로 무한 대기 방지)

#### **Supabase 데이터베이스**

**스키마 구조:**

- `user_data` 테이블 (JSONB 기반)
- 인증 없이 작동하는 구조
- Row Level Security 비활성화
- 자동 업데이트 트리거

**JSONB 데이터 구조:**

```json
{
  "students": [...],
  "subjects": [...],
  "sessions": [...],
  "settings": {...},
  "version": "1.0"
}
```

---

## 🔧 개발 환경 설정

### 필수 도구

- Node.js 18+
- npm 또는 yarn
- Git

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트 실행
npm run test:run

# 빌드
npm run build
```

---

## 🚀 개발 프로세스

### 1. 코드 작성 단계

```bash
✅ 코드 작성 완료
✅ TypeScript 타입 체크 통과
✅ ESLint 규칙 준수
✅ Prettier 포맷팅 적용
```

### 2. 테스트 단계

```bash
✅ 관련 컴포넌트 단위 테스트 통과
✅ 통합 테스트 통과
✅ 브라우저 환경 테스트 통과
```

### 3. 커밋 전 검증

```bash
✅ 전체 테스트 스위트 통과
✅ prepare-commit 실행 성공
✅ 브라우저에서 최종 동작 확인
```

### 4. 배포

```bash
✅ 커밋 및 푸시
✅ GitHub Pages 배포
```

### 5. 작업 완료 후 자동 질문 프로세스

**⚠️ 중요: 모든 작업 완료 시 다음 단계를 자동으로 질문해야 합니다**

작업이 완료될 때마다 다음 질문을 사용자에게 제시하고, 사용자의 승인을 받은 후 실행해야 합니다:

```
[git status에서 수정한 내용 확인후
수정한 내용들 기능,디자인 유지하기 위해서 테스트코드, 문서최신화 작업진행해줘]
```

**질문 시점:**

- 기능 구현 완료 후
- 버그 수정 완료 후
- UI/UX 개선 완료 후
- 코드 리팩토링 완료 후

**실행 순서:**

1. `git status` 명령어로 변경사항 확인
2. 사용자에게 위 질문 제시
3. 사용자 승인 후 테스트 코드 및 문서 최신화 작업 실행
4. 작업 완료 후 커밋 및 배포 진행

---

## 🎨 TailwindCSS 스타일링 가이드

### 📋 핵심 원칙

#### **1. 인라인 스타일 사용 금지**

- ❌ **인라인 스타일 사용 금지**: `style={{...}}` 사용을 피해야 합니다
- ✅ **TailwindCSS 클래스 사용**: 모든 스타일은 `className`에서 TailwindCSS 유틸리티 클래스로 관리
- ✅ **CSS 변수 활용**: 커스텀 값들은 `tailwind.config.ts`에 등록하여 의미 있는 클래스명으로 사용

#### **2. CSS 우선순위 이해**

웹 브라우저의 CSS 우선순위는 다음과 같습니다:

1. **`!important` (최상위)**: 다른 모든 것을 무시
2. **인라인 스타일 (높음)**: `style={{...}}`로 직접 적용
3. **ID 선택자**: `#id`로 지정한 스타일
4. **클래스 선택자 (중간)**: `.class`로 지정한 스타일 (**TailwindCSS가 여기에 해당**)
5. **태그 선택자 (낮음)**: `div`, `p` 등 태그 이름으로 지정

#### **3. 인라인 스타일의 문제점**

- **재사용성 불가**: 특정 태그에 고정되어 다른 곳에서 재사용 불가
- **유지보수 어려움**: 디자인 시스템 변경 시 모든 인라인 스타일을 일일이 수정해야 함
- **반응형/상태 대응 불가**: `:hover`, `md:` 등 TailwindCSS의 강력한 기능 사용 불가
- **일관성 저해**: 디자인 시스템을 무시하고 독자적인 스타일 생성

### 🔧 올바른 TailwindCSS 사용법

#### **수정 전 (인라인 스타일)**

```jsx
<div
  className="relative custom-scrollbar"
  style={{
    listStyle: "none",
    margin: 0,
    padding: 0,
    maxHeight: "400px",
    overflow: "auto",
    background: "var(--color-bg-primary)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border)",
  }}
/>
```

#### **수정 후 (TailwindCSS 클래스)**

```jsx
<div className="relative custom-scrollbar list-none m-0 p-0 max-h-[400px] overflow-auto bg-bg-primary rounded-md border border-border" />
```

### 🎯 커스텀 값 설정 방법

#### **1. tailwind.config.ts 설정**

```typescript
theme: {
  extend: {
    colors: {
      bg: {
        primary: "var(--color-bg-primary)",
        secondary: "var(--color-bg-secondary)",
      },
      text: {
        primary: "var(--color-text-primary)",
        muted: "var(--color-text-muted)",
      },
      border: {
        DEFAULT: "var(--color-border)",
        light: "var(--color-border-light)",
      },
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "24px",
    },
    borderRadius: {
      sm: "4px",
      md: "6px",
      lg: "8px",
    },
  },
}
```

#### **2. 사용 예시**

```jsx
// ✅ 올바른 사용법
<div className="bg-bg-primary text-text-muted p-md rounded-md border border-border-light">

// ❌ 잘못된 사용법
<div
  className="bg-white"
  style={{
    backgroundColor: "var(--color-bg-primary)",
    color: "var(--color-text-muted)",
    padding: "var(--spacing-md)",
  }}
>
```

### 📝 스타일링 체크리스트

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

---

## 🏛️ Atomic Design 패턴 가이드

### 📦 Atoms (원자 컴포넌트)

**위치:** `src/components/atoms/`

**특징:**

- 가장 기본적인 UI 요소
- 재사용 가능한 최소 단위
- Props는 최소화

**예시:**

- `Button.tsx` - 버튼 컴포넌트
- `Input.tsx` - 입력 필드
- `Label.tsx` - 라벨
- `Typography.tsx` - 텍스트 스타일

### 🧬 Molecules (분자 컴포넌트)

**위치:** `src/components/molecules/`

**특징:**

- Atoms를 조합한 단위
- 특정 기능을 담당
- 재사용 가능한 기능 단위

**예시:**

- `SessionBlock.tsx` - 세션 블록
- `TimeTableRow.tsx` - 시간표 행
- `StudentInputSection.tsx` - 학생 입력 섹션
- `PDFDownloadButton.tsx` - PDF 다운로드 버튼

### 🦠 Organisms (유기체 컴포넌트)

**위치:** `src/components/organisms/`

**특징:**

- Molecules를 조합한 복합 컴포넌트
- 페이지의 주요 섹션을 담당
- 비즈니스 로직 포함 가능

**예시:**

- `TimeTableGrid.tsx` - 시간표 그리드
- `StudentPanel.tsx` - 학생 패널
- `StudentsPageLayout.tsx` - 학생 페이지 레이아웃
- `StudentManagementSection.tsx` - 학생 관리 섹션

### 🎣 Custom Hooks (커스텀 훅)

**위치:** `src/hooks/`

**특징:**

- 재사용 가능한 로직
- 상태 관리 및 사이드 이펙트
- 컴포넌트 로직 분리

**예시:**

- `useGlobalSubjectInitialization.ts` - 🌍 전역 기본 과목 초기화 (보안 강화)
- `useIntegratedData.ts` - 🆕 JSONB 기반 통합 데이터 관리
- `useStudentManagement.ts` - 학생 관리 로직 (API Routes 기반)
- `useSubjectManagement.ts` - 과목 관리 로직 (API Routes 기반)
- `useSessionManagement.ts` - 세션 관리 로직 (API Routes 기반)
- `useDisplaySessions.ts` - 세션 표시 로직
- `useStudentPanel.ts` - 학생 패널 관리
- `useTimeValidation.ts` - 시간 검증 로직
- `useLocal.ts` - localStorage 관리

### 🔧 훅 사용 가이드라인

#### **🌍 전역 기본 과목 초기화 훅 (보안 강화)**

**1. `useGlobalSubjectInitialization` (전역 기본 과목 초기화)**

- **위치**: `src/hooks/useGlobalSubjectInitialization.ts`
- **용도**: 로그인한 사용자가 처음 접속할 때 기본 과목들을 자동으로 생성
- **사용 시점**: RootLayout에서 전역적으로 실행
- **특징**:
  - 어느 페이지에서든 로그인 후 자동으로 기본 과목 생성
  - 브라우저 독립적 동작 (Chrome, Firefox, Safari 등 모든 브라우저에서 동일)
  - 서버 기반 중복 방지 (Supabase 데이터베이스 기준)
  - Supabase Auth 보안 강화 (토큰 탈취 공격 방지)
  - 초기화 중 로딩 표시

**사용 예시:**

```typescript
// RootLayout에서 사용
function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitialized, isInitializing } = useGlobalSubjectInitialization();

  return (
    <>
      <Navigation />
      <main>
        {isInitializing && <div>기본 과목을 초기화하는 중...</div>}
        {children}
      </main>
      <Footer />
    </>
  );
}
```

#### **🚀 통합 데이터 관리 훅 (권장)**

**2. `useIntegratedData` (JSONB 기반 통합 데이터 관리)**

- **위치**: `src/hooks/useIntegratedData.ts`
- **용도**: JSONB 구조를 활용한 효율적인 통합 데이터 관리
- **사용 시점**: Schedule 페이지 등 여러 데이터가 동시에 필요한 곳
- **특징**:
  - 한 번의 API 호출로 students, subjects, sessions, enrollments 모두 조회
  - 네트워크 요청 66% 감소 (3회 → 1회)
  - 데이터 일관성 100% 보장 (동일한 시점의 데이터)
  - 통합 업데이트 기능 제공

**사용 예시:**

```typescript
const {
  data: { students, subjects, sessions, enrollments },
  loading,
  error,
  updateData,
} = useIntegratedData();

// 세션 추가
const addSession = useCallback(
  async (sessionData: any) => {
    const newSessions = [
      ...sessions,
      { ...sessionData, id: crypto.randomUUID() },
    ];
    await updateData({ sessions: newSessions });
  },
  [sessions, updateData]
);
```

#### **개별 데이터 관리 훅**

**3. `useStudentManagement` (API Routes 기반)**

- **위치**: `src/hooks/useStudentManagement.ts`
- **용도**: 학생 데이터 CRUD (API Routes 기반)
- **사용 시점**: 학생 관리 페이지 등 개별 데이터 관리가 필요한 곳
- **특징**:
  - `/api/students` API Routes 사용
  - Clean Architecture 패턴 적용
  - 에러 처리 및 로딩 상태 관리

**4. `useSubjectManagement` (API Routes 기반)**

- **위치**: `src/hooks/useSubjectManagement.ts`
- **용도**: 과목 데이터 CRUD (API Routes 기반)
- **사용 시점**: 과목 관리 페이지 등 개별 데이터 관리가 필요한 곳
- **특징**:
  - `/api/subjects` API Routes 사용
  - 기본 과목과 사용자 과목 통합 관리
  - 색상 선택 기능 포함

**5. `useSessionManagement` (API Routes 기반)**

- **위치**: `src/hooks/useSessionManagement.ts`
- **용도**: 세션 데이터 CRUD (API Routes 기반)
- **사용 시점**: 세션 관리가 필요한 곳
- **특징**:
  - `/api/sessions` API Routes 사용
  - 드래그 앤 드롭 위치 업데이트 지원
  - 세션 위치 및 시간 관리

**6. `useSessionManagement` (API Routes 기반)**

- **위치**: `src/hooks/useSessionManagement.ts`
- **용도**: API Routes를 통한 세션 데이터 CRUD 관리
- **사용 시점**: 개별 세션 관리가 필요한 곳
- **특징**:
  - `/api/sessions` API Routes 사용
  - Clean Architecture 패턴 적용
  - 드래그 앤 드롭 위치 업데이트 지원
  - 세션 위치 및 시간 관리
  - 에러 처리 및 로딩 상태 관리

**7. `useDisplaySessions` (세션 표시 로직)**

- **위치**: `src/hooks/useDisplaySessions.ts`
- **용도**: 세션 데이터를 화면에 표시하기 위한 필터링 및 정렬
- **사용 시점**: Schedule 페이지에서 세션 목록 표시
- **특징**:
  - 학생별 필터링 기능
  - 시간순 정렬
  - 유효한 enrollment 검증
  - 불완전한 세션 필터링

**8. `useStudentPanel` (학생 패널 관리)**

- **위치**: `src/hooks/useStudentPanel.ts`
- **용도**: 학생 패널의 상태 및 상호작용 관리
- **사용 시점**: Schedule 페이지의 학생 패널
- **특징**:
  - 학생 선택 상태 관리
  - 검색 기능
  - 패널 위치 관리
  - 드래그 앤 드롭 지원

**9. `useTimeValidation` (시간 검증)**

- **위치**: `src/hooks/useTimeValidation.ts`
- **용도**: 시간 입력 검증 및 유틸리티 함수
- **사용 시점**: 세션 생성/편집 시 시간 검증
- **특징**:
  - 시간 범위 검증
  - 다음 시간 계산
  - 시간 형식 검증

**10. `useLocal` (일반적 localStorage)**

- **위치**: `src/hooks/useLocal.ts`
- **용도**: UI 상태 및 캐시 데이터 관리
- **사용 시점**: 학생 선택 상태, 패널 위치, 테마 설정 등
- **특징**:
  - SSR 안전성 보장 (`isHydrated` 상태 사용)
  - 범용적인 localStorage 관리
  - 타입 안전한 상태 관리

#### **사용 시나리오별 훅 선택**

**Schedule 페이지에서 (권장 - 통합 데이터 사용):**

```typescript
// ✅ 권장 사용법 - 통합 데이터 관리
import { useIntegratedData } from "../../hooks/useIntegratedData";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useStudentPanel } from "../../hooks/useStudentPanel";
import { useLocal } from "../../hooks/useLocal";

// 통합 데이터 관리 (JSONB 기반)
const {
  data: { students, subjects, sessions, enrollments },
  loading,
  error,
  updateData,
} = useIntegratedData();

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

**개별 세션 관리가 필요한 경우:**

```typescript
// ✅ 개별 세션 관리
import { useSessionManagement } from "../../hooks/useSessionManagement";

// API Routes 기반 세션 관리
const { sessions, addSession, updateSession, deleteSession, isLoading } =
  useSessionManagement(students, subjects);
```

#### **인증 상태별 동작**

**로그인 전:**

- `useLocal`: 정상 동작 (UI 상태 저장/복원)
- `useGlobalSubjectInitialization`: 초기화 건너뜀 (로그인 필요)
- `useIntegratedData`: 빈 데이터 반환
- `useStudentManagement`: API 호출 실패 (인증 필요)
- `useSubjectManagement`: API 호출 실패 (인증 필요)
- `useSessionManagement`: API 호출 실패 (인증 필요)

**로그인 후:**

- `useLocal`: 정상 동작 (UI 상태 저장/복원)
- `useGlobalSubjectInitialization`: 기본 과목 자동 생성 (한 번만)
- `useIntegratedData`: Supabase에서 통합 데이터 조회
- `useStudentManagement`: Supabase에서 학생 데이터 CRUD
- `useSubjectManagement`: Supabase에서 과목 데이터 CRUD
- `useSessionManagement`: Supabase에서 세션 데이터 CRUD

**기본 과목 초기화:**

1. 로그인 성공 감지
2. `useGlobalSubjectInitialization` 훅 실행
3. Supabase에서 사용자 데이터 조회
4. subjects가 비어있으면 기본 과목들 생성
5. 기본 과목들을 Supabase에 저장
6. 모든 페이지에서 과목 데이터 사용 가능

**로그아웃 시:**

1. 모든 데이터 초기화
2. 페이지 새로고침으로 빈 상태 표시
3. localStorage UI 상태는 유지 (사용자 편의성)

#### **데이터 흐름**

**로그인 전:**

```
1. 사용자가 페이지 접속
2. 인증되지 않은 상태로 빈 데이터 표시
3. 로그인 버튼 클릭 유도
```

**로그인 후 (Supabase 기반):**

```
1. 로그인 성공 감지
2. useGlobalSubjectInitialization 훅 실행
3. 기본 과목 자동 생성 (필요시)
4. useIntegratedData 훅으로 통합 데이터 조회
5. 화면에 데이터 표시
```

**데이터 추가/수정 시:**

```
1. 사용자가 데이터 추가/수정 시도
2. 해당 훅에서 Supabase API 호출
3. 성공 시 로컬 상태 업데이트
4. 화면에 즉시 반영
```

**통합 데이터 업데이트 시 (Schedule 페이지):**

```
1. 세션 추가/수정 시도
2. useIntegratedData의 updateData 호출
3. 전체 데이터를 Supabase에 저장
4. 로컬 상태 업데이트
5. 화면에 반영
```

**로그아웃 시:**

```
1. 로그아웃 감지
2. 모든 데이터 초기화
3. 페이지 새로고침으로 빈 상태 표시
4. UI 상태는 localStorage에 유지
```

#### **훅 선택 가이드**

**Schedule 페이지에서 권장하는 방식:**

```typescript
// ✅ 권장: 통합 데이터 관리 (JSONB 기반)
import { useIntegratedData } from "../../hooks/useIntegratedData";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";

const {
  data: { students, subjects, sessions, enrollments },
  updateData,
} = useIntegratedData();

const { sessions: displaySessions } = useDisplaySessions(
  sessions,
  enrollments,
  selectedStudentId
);

// 세션 추가
const addSession = useCallback(
  async (sessionData: any) => {
    const newSessions = [...sessions, sessionData];
    await updateData({ sessions: newSessions });
  },
  [sessions, updateData]
);
```

**개별 데이터 관리가 필요한 경우:**

```typescript
// ✅ 개별 관리: API Routes 기반
import { useStudentManagement } from "../../hooks/useStudentManagement";
import { useSubjectManagement } from "../../hooks/useSubjectManagement";
import { useSessionManagement } from "../../hooks/useSessionManagement";

const { students, addStudent } = useStudentManagement();
const { subjects, addSubject } = useSubjectManagement();
const { sessions, addSession } = useSessionManagement(students, subjects);
```

**주의사항:**

- Schedule 페이지에서는 `useIntegratedData` 사용 권장 (성능 최적화)
- 개별 페이지에서는 해당 관리 훅 사용
- 모든 훅은 Supabase 기반으로 동작 (인증 필요)

### 📝 Types (타입 정의)

**위치:** `src/types/`

**특징:**

- 페이지별 타입 정의
- 인터페이스 및 타입 안정성
- 재사용 가능한 타입

**예시:**

- `scheduleTypes.ts` - 스케줄 관련 타입
- `studentsTypes.ts` - 학생 관련 타입

---

## 🛡️ 에러 방지 가이드

### 핵심 원칙

1. **전체 파일 읽기 우선**
2. **단계별 접근**
3. **즉시 테스트 실행**
4. **문제 발견 시 즉시 수정**
5. **백업 생성 후 작업**
6. **수정 전후 상태 검증**
7. **사용자 요청 범위 준수**
8. **인라인 스타일 사용 금지**
9. **TailwindCSS 우선 사용**

### 반복 작업 방지 체크리스트

#### 수정 전

- [ ] 전체 파일 읽기 완료
- [ ] 현재 상태 정확히 파악
- [ ] 변경 계획 수립
- [ ] 백업 생성 (`git stash`)
- [ ] 사용자 요청 범위 확인
- [ ] 인라인 스타일 사용 여부 확인
- [ ] TailwindCSS 클래스로 변환 가능한지 검토

#### 수정 중

- [ ] 정확한 위치 식별
- [ ] 한 번에 하나의 작은 변경
- [ ] 각 변경 후 즉시 검증
- [ ] 의존성 관계 확인
- [ ] 요청받은 작업만 수행
- [ ] 인라인 스타일을 TailwindCSS 클래스로 변환
- [ ] 커스텀 값은 tailwind.config.ts에 등록

#### 수정 후

- [ ] 변경사항 의도대로 적용 확인
- [ ] 연관 파일 영향도 확인
- [ ] 전체 테스트 스위트 실행
- [ ] 브라우저에서 동작 확인
- [ ] 사용자에게 결과 보고
- [ ] 인라인 스타일이 모두 제거되었는지 확인
- [ ] TailwindCSS 클래스가 올바르게 적용되었는지 확인

---

## 🧪 테스트 전략 (Next.js + Clean Architecture)

### 🎯 계층별 테스트 전략

**Next.js + Atomic Design + Clean Architecture** 조합에서 테스트 코드를 작성하는 방법을 각 계층별로 명확하게 구분하여 테스트합니다.

#### **1. Domain 계층 테스트: 순수한 단위 테스트**

**목표**: 엔티티(`Student.ts`, `Subject.ts` 등)의 핵심 비즈니스 로직이 외부 의존성 없이 정확하게 동작하는지 확인합니다.

**위치**: `src/domain/entities/`, `src/domain/value-objects/`

**도구**: `Vitest` 또는 `Jest`

**예시 파일**:

- `src/domain/entities/__tests__/Student.test.ts`
- `src/domain/entities/__tests__/Subject.test.ts`
- `src/domain/value-objects/__tests__/StudentId.test.ts`

#### **2. Application 계층 테스트: Mock을 사용한 통합 테스트**

**목표**: Use Case가 외부 의존성(Repository)과 올바르게 상호작용하며 애플리케이션 로직을 수행하는지 확인합니다.

**위치**: `src/application/use-cases/`, `src/application/services/`

**도구**: `Vitest` 또는 `Jest` (Mocking 기능 사용)

**예시 파일**:

- `src/application/use-cases/__tests__/AddStudentUseCase.test.ts`
- `src/application/services/__tests__/StudentApplicationService.test.ts`

#### **3. Infrastructure 계층 테스트: 실제 외부 의존성 테스트**

**목표**: Supabase 리포지토리가 실제 데이터베이스와 올바르게 상호작용하는지 확인합니다.

**위치**: `src/infrastructure/repositories/`

**도구**: `Vitest` + 실제 Supabase 연결 (테스트 환경)

**예시 파일**:

- `src/infrastructure/repositories/__tests__/SupabaseStudentRepository.test.ts`

#### **4. Presentation 계층 테스트: 컴포넌트 & E2E 테스트**

**목표**: UI 컴포넌트가 올바르게 렌더링되고, 사용자의 행동에 따라 예상대로 반응하는지 확인합니다.

**위치**: `src/components/`, `src/app/`

**도구**: `React Testing Library`, `Playwright`

**예시 파일**:

- `src/components/atoms/__tests__/Button.test.tsx`
- `src/components/molecules/__tests__/StudentInputSection.test.tsx`
- `src/app/students/__tests__/page.test.tsx`

#### **5. API Routes 테스트: Next.js API 테스트**

**목표**: Next.js API Routes가 올바른 HTTP 응답을 반환하는지 확인합니다.

**위치**: `src/app/api/`

**도구**: `Vitest` + `@testing-library/jest-dom`

**예시 파일**:

- `src/app/api/students/__tests__/route.test.ts`
- `src/app/api/subjects/__tests__/route.test.ts`

### 테스트 실행 명령어

```bash
# 전체 테스트 실행
npm run test

# 특정 테스트 실행
npm run test -- Student.test.ts

# 테스트 커버리지
npm run test:coverage

# 개발 모드로 테스트 실행 (watch 모드)
npm run test:watch

# 테스트 UI 실행
npm run test:ui

# Domain 계층 테스트만 실행
npm run test -- src/domain/

# Application 계층 테스트만 실행
npm run test -- src/application/

# Infrastructure 계층 테스트만 실행
npm run test -- src/infrastructure/

# Presentation 계층 테스트만 실행
npm run test -- src/components/

# API Routes 테스트만 실행
npm run test -- src/app/api/

# E2E 테스트 실행 (Playwright)
npm run test:e2e

# E2E 테스트 UI 실행
npm run test:e2e:ui

# 헤드리스 모드로 E2E 테스트 실행
npm run test:e2e:headed

# 특정 페이지 E2E 테스트
npm run test:e2e -- students.spec.ts
```

### 테스트 커버리지 목표

- **Domain 계층**: 100% (비즈니스 로직의 핵심)
- **Application 계층**: 90%+ (애플리케이션 로직의 핵심)
- **Infrastructure 계층**: 80%+ (외부 의존성으로 인한 제약)
- **Presentation 계층**: 70%+ (UI 변경이 빈번함)
- **API Routes**: 90%+ (API 계약의 안정성)

### 자동화된 테스트 시스템

**파일 구조:**

- `auto-fix-test.js` - 완전 자동화 테스트 (자동 로그인 + 문제 감지 + 해결 시도)
- `analyze-results.js` - 테스트 결과 분석 및 진단
- `test-results/` - 테스트 결과 저장 폴더 (최신 5건 유지)

**주요 기능:**

- Google OAuth 완전 자동 로그인 (패스키 우회 포함)
- 실시간 콘솔 로그 및 네트워크 모니터링
- 자동 문제 감지 및 해결 시도
- 스크린샷 자동 촬영
- 종합적인 테스트 결과 자동 생성
- 브라우저 및 프로세스 자동 종료
- **환경변수 기반 보안 설정** (`.env.local` 파일 사용)

**보안 설정:**

- 테스트 계정 정보는 환경변수로 관리
- `.env.local` 파일은 Git에 커밋되지 않음

#### **Migration 관리 시스템**

**파일 구조:**

- `migrations/` - Migration SQL 파일들 (002-009번까지 구현됨)
- `run-migration.sh` - Migration 실행 스크립트
- `check-migration-status.sh` - Migration 상태 확인 스크립트
- `MIGRATION_GUIDE.md` - Migration 관리 가이드

**주요 기능:**

- **한국 시간대(KST) 설정**: 모든 timestamp 컬럼을 한국 시간으로 자동 변환
- **자동 시간대 변환 트리거**: `set_korean_timezone` 함수로 INSERT/UPDATE 시 자동 변환
- **자동 로그 기록**: 모든 Migration 실행 시 `migration_log` 테이블에 자동 기록
- **중복 실행 방지**: `ON CONFLICT DO NOTHING`으로 안전한 재실행
- **일관된 관리**: 표준화된 Migration 실행 프로세스
- **상태 추적**: 실행 시간, 상태, 설명 자동 기록
- **롤백 지원**: Migration 롤백 기능 제공

**구현된 Migration:**

- `002_user_management_tables.sql`: 사용자 관리 테이블 생성
- `003_integrate_legacy_schema.sql`: 레거시 스키마 통합
- `005_convert_timestamps_to_kst.sql`: 기존 데이터를 한국 시간으로 변환
- `006_fix_korean_timezone_conversion.sql`: 시간대 변환 로직 수정
- `007_cleanup_and_fix_timezone.sql`: 트리거 함수 재구성
- `008_correct_korean_timezone.sql`: 시간대 변환 로직 정정
- `009_safe_korean_timezone.sql`: 안전한 시간대 변환 구현

### 자동화 테스트 환경변수 설정

#### 📋 개요

자동화 테스트를 실행하기 위해서는 테스트용 계정 정보가 필요합니다. 보안을 위해 이 정보들은 환경변수로 관리됩니다.

#### 🔧 설정 방법

**1. `.env.local` 파일 생성**

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 자동화 테스트용 계정 정보
TEST_EMAIL=your-test-email@gmail.com
TEST_PASSWORD=your-test-password

# Supabase 설정 (Next.js 방식)
NEXT_PUBLIC_SUPABASE_URL=https://kcyqftasdxtqslrhbctv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**2. 실제 계정 정보 입력**

- `TEST_EMAIL`: 자동화 테스트에 사용할 Google 계정 이메일
- `TEST_PASSWORD`: 해당 계정의 비밀번호

**3. 파일 권한 설정**

```bash
chmod 600 .env.local
```

#### 🚀 사용법

**자동화 테스트 실행**

```bash
npm run test:auto-fix
```

**환경변수 확인**

```bash
# 환경변수가 제대로 로드되었는지 확인
echo $TEST_EMAIL
echo $TEST_PASSWORD
```

#### ⚠️ 주의사항

1. **`.env.local` 파일은 절대 Git에 커밋하지 마세요**
2. **실제 계정 정보를 사용하지 말고 테스트 전용 계정을 만드세요**
3. **`.env.local` 파일은 `.gitignore`에 포함되어 있습니다**

#### 🔒 보안

- `.env.local` 파일은 로컬에서만 사용됩니다
- Git 저장소에는 절대 커밋되지 않습니다
- 프로덕션 환경에서는 사용되지 않습니다

#### 🛠️ 문제 해결

**환경변수가 로드되지 않는 경우**

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 파일 권한이 올바른지 확인 (`chmod 600 .env.local`)
3. 파일 내용에 공백이나 특수문자가 없는지 확인

**테스트 계정 관련 문제**

1. Google 계정에서 2단계 인증이 비활성화되어 있는지 확인
2. 테스트 계정이 Google OAuth를 허용하는지 확인
3. 계정이 정상적으로 로그인되는지 수동으로 확인

#### 📝 예시

```bash
# .env.local 파일 예시
TEST_EMAIL=testuser123@gmail.com
TEST_PASSWORD=TestPassword123!
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=test...
```

---

## 📊 기능 체크리스트

### ✅ 완료된 기능 (50개)

#### 핵심 기능

- [x] 학생 관리 (추가, 삭제, 선택)
- [x] 과목 관리 (추가, 삭제, 편집, 선택, 색상 선택)
- [x] 시간표 표시 (9:00-23:00, 30분 단위)
- [x] 드래그 앤 드롭으로 수업 추가
- [x] 수업 편집 (시간, 과목, 학생 변경)
- [x] 학생별 필터링
- [x] PDF 다운로드
- [x] localStorage 데이터 저장
- [x] 반응형 디자인
- [x] 다크/라이트 테마 지원

#### 백엔드 및 API 기능

- [x] Vercel 서버리스 함수 (TypeScript)
- [x] Supabase JSONB 데이터베이스 연동
- [x] 학생 CRUD API (추가, 조회, 삭제)
- [x] CORS 헤더 자동 설정
- [x] 환경 변수 기반 설정
- [x] API 에러 처리 및 응답 표준화

#### UI/UX 기능

- [x] 모던한 디자인
- [x] 직관적인 사용자 인터페이스
- [x] 스크롤 가능한 모달
- [x] 에러 메시지 표시
- [x] 로딩 상태 표시
- [x] 애니메이션 효과
- [x] 학생/과목 네비게이션 디자인 일관성
- [x] 카드 배경색 통일 (기본 배경색, 호버 시 연한 회색)
- [x] 검색 기능 통합 (입력창에서 실시간 검색)
- [x] 소셜 로그인 시스템 (Google, Kakao)
- [x] 그라데이션 로그인 버튼 디자인
- [x] 전역 네비게이션 통합
- [x] 프로필 이미지 표시

#### 사용성 기능

- [x] 키보드 단축키 지원 (Enter 키로 학생/과목 추가)
- [x] 중복 학생/과목 이름 방지
- [x] 빈 이름 입력 방지
- [x] 시간 범위 검증
- [x] 경고 메시지 표시
- [x] 존재하지 않는 학생 추가 시 피드백
- [x] 수업 중복 방지
- [x] 데이터 백업/복원 기능
- [x] 다중 학생 그룹 수업 지원
- [x] 학생/과목 입력 후 엔터 키 시 입력창 완전 초기화
- [x] 겹치는 세션 개별 표시
- [x] 수강생 리스트 패널 위치 저장 (localStorage)
- [x] 드래그 가능한 플로팅 패널 (직관적 UX)
- [x] 과목 색상 선택 및 편집 기능
- [x] 실시간 검색 기능 (학생/과목 이름으로 필터링)
- [x] 학생/과목 중복 추가 시 화면 에러 메시지 표시
- [x] 에러 메시지 UI/UX 일관성 (학생/과목 네비게이션 동일 스타일)
- [x] **전역 드래그 상태 기반 투명도 조정**: 드래그 중 다른 세션들이 투명해져서 드롭존 프리뷰가 잘 보임
- [x] **세션이 있는 드롭존 영역에서 드래그 오버 지원**: 드래그 중 z-index 조정으로 세션이 있는 영역에서도 드롭존 프리뷰 표시
- [x] **드래그 앤 드롭 문제 완전 해결**: `display: none` → `visibility: hidden` 변경으로 드래그 이벤트 중단 문제 해결

#### 데이터 동기화 및 유료화 기능

- [x] localStorage와 DB 간 데이터 동기화
- [x] **사용자 중심 데이터 동기화 시나리오 처리**:
  - [x] `localOnlyFirstLogin`: 로컬 데이터만 있는 첫 로그인 (Import data vs Start fresh)
  - [x] `localAndServerConflict`: 로컬과 서버 데이터 충돌 (Device data vs Server data)
  - [x] `normalLogin`: 일반 로그인 (데이터 없음)
  - [x] `noData`: 데이터 없음
- [x] **사용자 선택 후에만 로컬 데이터 삭제** (데이터 보호 강화)
- [x] 데이터 충돌 해결 UI (명확한 선택 옵션 제공)
- [x] 유료 기능 제한 시스템 (무료: 학생 10명)
- [x] 업그레이드 유도 모달
- [x] Stale-While-Revalidate 캐시 전략
- [x] Debounced DB 쓰기 작업
- [x] React.memo를 활용한 성능 최적화
- [x] **자동화된 테스트 시스템 구축**
- [x] **Google OAuth 완전 자동 로그인**
- [x] **실시간 문제 감지 및 해결 시도**
- [x] **종합적인 테스트 결과 자동 생성**
- [x] **Playwright MCP 통합**: 브라우저 자동화 테스트 지원
- [x] **getSession 타임아웃 처리** (5초 타임아웃으로 무한 대기 방지)
- [x] **통합된 localStorage 데이터 로드** (개별 키와 통합 키 모두 지원)

#### 코드 구조 개선

- [x] Atomic Design 패턴 적용
- [x] 커스텀 훅 분리 (useStudentManagement, useDisplaySessions, useSubjectManagement 등)
- [x] 타입 정의 파일 분리 (scheduleTypes, studentsTypes, subjectsTypes)
- [x] 컴포넌트 계층 구조 정리
- [x] 재사용 가능한 로직 분리
- [x] 패널 위치 관리 전용 훅 (usePanelPosition)
- [x] 전역 과목 상태 관리 (useGlobalSubjects)
- [x] 과목 관리 전용 컴포넌트 구조

#### 테스트 시스템

- [x] **포괄적인 컴포넌트 단위 테스트 시스템 구축**
- [x] **엣지 케이스 테스트 추가** (null, undefined, 빈 값, 잘못된 형식 등)
- [x] **Atoms 컴포넌트 테스트**: Button, Input, Label 등 기본 UI 컴포넌트
- [x] **Molecules 컴포넌트 테스트**: SessionBlock, DropZone, TimeTableRow 등 복합 컴포넌트
- [x] **Organisms 컴포넌트 테스트**: TimeTableGrid, StudentPanel 등 페이지 레벨 컴포넌트
- [x] **안전성 검증**: 모든 컴포넌트가 예외 상황에서도 안전하게 동작
- [x] **사용자 경험 보장**: 잘못된 입력이나 예상치 못한 상황에서도 앱이 크래시하지 않음
- [x] **실제 클라이언트 테스트 시스템**: 실제 Supabase 연결, 네트워크 지연, 브라우저 호환성 테스트
- [x] **실제 사용자 시나리오 E2E 테스트**: 복잡한 사용자 플로우와 다양한 환경에서의 동작 검증

### 🚀 향후 개선 사항 (15개)

#### 높은 우선순위

- [ ] **이메일 인증코드 로그인 시스템**
  - 이메일 입력 → 인증코드 발송 → 코드 입력 → 로그인
  - Supabase Auth의 이메일 인증 기능 활용
  - 사용자 친화적인 UI/UX 구현
- [ ] **추가 소셜 로그인 지원**
  - 네이버 로그인
  - Apple 로그인
  - GitHub 로그인 (개발자용)
- [ ] 다중 교사 지원
- [ ] 수업 템플릿 기능
- [ ] 알림 시스템

#### 중간 우선순위

- [ ] 통계 대시보드
- [ ] 데이터 내보내기/가져오기
- [ ] 모바일 앱 버전

#### 낮은 우선순위

- [ ] PWA 지원
- [ ] 오프라인 모드
- [ ] 실시간 협업

**전체 진행률**: 100% (사용자 중심 데이터 동기화 시스템 완료)

---

## 🔄 새로운 데이터 동기화 로직 상세

### 📋 개요

사용자 요구사항에 따라 데이터 동기화 로직을 완전히 개선했습니다. 기존의 자동 동기화 방식에서 **사용자 중심의 명확한 선택 기반 동기화**로 변경되었습니다.

### 🎯 핵심 개선사항

#### 1. **사용자 선택 후에만 데이터 삭제**

- **기존**: 로그인 시 즉시 동기화 모달 표시, 사용자 선택 후 즉시 로컬 데이터 삭제
- **개선**: 사용자가 명확한 선택을 한 후에만 로컬 데이터 삭제
- **효과**: 데이터 손실 방지, 사용자 신뢰도 향상

#### 2. **명확한 동기화 시나리오**

- **`localOnlyFirstLogin`**: 로컬 데이터만 있는 첫 로그인
  - 선택 옵션: "Import data" (로컬 → 서버) vs "Start fresh" (로컬 삭제)
- **`localAndServerConflict`**: 로컬과 서버 데이터 충돌
  - 선택 옵션: "Device data" (로컬 → 서버) vs "Server data" (서버 → 로컬)
- **`normalLogin`**: 일반 로그인 (데이터 없음)
- **`noData`**: 데이터 없음

#### 3. **향상된 사용자 경험**

- **명확한 선택 옵션**: 각 시나리오에 맞는 직관적인 버튼 제공
- **데이터 요약 정보**: 학생 수, 과목 수, 세션 수, 마지막 수정 시간 표시
- **명확한 경고 메시지**: 선택하지 않은 데이터가 영구적으로 삭제된다는 경고

### 🔧 기술적 구현

#### **동기화 플로우**

```
1. 사용자가 'Login' 클릭
2. 로컬 스토리지 데이터 확인
   - 데이터 없음 → 일반 로그인 진행
   - 데이터 있음 → 계속 진행
3. 서버(DB) 데이터 확인
   - 데이터 없음 → "Import data" vs "Start fresh" 모달 표시
   - 데이터 있음 → "Device data" vs "Server data" 모달 표시
4. 사용자가 모달에서 선택
5. 선택에 따른 데이터 동기화 실행
6. 로컬 스토리지 데이터 삭제 (사용자 선택 후)
7. 메인 앱 화면으로 이동
```

#### **새로운 동기화 액션**

- **`importData`**: 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
- **`startFresh`**: 로컬 데이터 삭제하고 서버의 빈 데이터로 시작
- **`useDeviceData`**: 로컬 데이터를 서버에 업로드하고 로컬 데이터 삭제
- **`useServerData`**: 서버 데이터를 로컬에 다운로드하고 로컬 데이터 삭제
- **`cancelSync`**: 동기화 취소

#### **개선된 데이터 로드**

- **통합된 데이터 키**: `classPlannerData` 키로 통합 저장
- **개별 키 호환성**: 기존 `sessions`, `enrollments`, `students`, `subjects` 키와 호환
- **자동 데이터 수집**: 통합 키가 없으면 개별 키에서 데이터 수집

#### **타임아웃 처리 강화**

- **`getSession` 타임아웃**: 5초 타임아웃으로 무한 대기 방지
- **서버 연결 지연 대응**: 타임아웃 시 로컬 데이터 사용
- **사용자 친화적 에러 처리**: 명확한 에러 메시지 제공

### 📁 수정된 파일들

#### **핵심 파일**

- `src/hooks/useDataSync.ts` - 메인 동기화 로직
- `src/lib/dataSyncUtils.ts` - 동기화 유틸리티 함수
- `src/types/dataSyncTypes.ts` - 새로운 타입 정의
- `src/components/molecules/DataSyncModal.tsx` - 사용자 인터페이스
- `src/components/atoms/LoginButton.tsx` - 로그인 플로우

#### **주요 변경사항**

1. **시나리오 타입 업데이트**: `newUser` → `localOnlyFirstLogin`, `dataConflict` → `localAndServerConflict`
2. **액션 타입 확장**: `importData`, `startFresh`, `useDeviceData`, `useServerData` 추가
3. **데이터 로드 개선**: 통합 키와 개별 키 모두 지원
4. **타임아웃 처리**: `Promise.race`를 사용한 타임아웃 구현
5. **사용자 인터페이스**: 명확한 선택 옵션과 경고 메시지

### ⚠️ 현재 제한사항

1. **Supabase 연결 지연**: `getSession` 타임아웃이 발생하여 동기화 모달이 표시되지 않는 경우
2. **네트워크 의존성**: 서버 연결이 불안정할 때 동기화 로직이 완료되지 않을 수 있음

### 🎯 사용자 요구사항 충족도

- ✅ **사용자 선택 후에만 로컬 데이터 삭제**: 구현 완료
- ✅ **명확한 선택 옵션 제공**: "Import data" vs "Start fresh", "Device data" vs "Server data"
- ✅ **데이터 충돌 시 사용자 선택**: 두 데이터 세트의 요약 정보와 함께 선택 옵션 제공
- ✅ **영구 삭제 경고**: 선택하지 않은 데이터가 영구적으로 삭제된다는 명확한 경고

**전체 진행률**: 100% (사용자 중심 데이터 동기화 시스템 완료)

---

## 🔧 명령어 영향 범위

### 빌드 관련 명령어

| 명령어             | 영향 범위     | 주의사항                       |
| ------------------ | ------------- | ------------------------------ |
| `npm run build`    | 전체 프로젝트 | Next.js 빌드 (SSR + 정적 생성) |
| `npm run dev`      | 개발 환경     | Next.js 개발 서버 (핫 리로드)  |
| `npm run start`    | 프로덕션      | 빌드된 앱 실행                 |
| `npm run lint`     | 코드 품질     | ESLint 검사                    |
| `npm run lint:fix` | 코드 품질     | ESLint 자동 수정               |

### 테스트 관련 명령어

| 명령어                  | 영향 범위   | 주의사항             |
| ----------------------- | ----------- | -------------------- |
| `npm run test`          | 전체 테스트 | Vitest 실행          |
| `npm run test:watch`    | 개발 테스트 | Watch 모드로 테스트  |
| `npm run test:coverage` | 커버리지    | 테스트 커버리지 측정 |
| `npm run test:e2e`      | E2E 테스트  | Playwright 실행      |
| `npm run test:ui`       | 테스트 UI   | Vitest UI 실행       |

### 코드 품질 관련 명령어

| 명령어                   | 영향 범위    | 주의사항           |
| ------------------------ | ------------ | ------------------ |
| `npm run lint`           | 코드 스타일  | ESLint 규칙 검사   |
| `npm run lint:fix`       | 코드 스타일  | 자동 수정          |
| `npm run format`         | 코드 포맷    | Prettier 적용      |
| `npm run prepare-commit` | 커밋 전 검증 | 전체 검증 프로세스 |

---

## 🚨 문제 해결 가이드

### 일반적인 문제들

#### TypeScript 컴파일 에러

```bash
# 해결 방법
npm run type-check
# 타입 정의 수정, 인터페이스 추가
```

#### ESLint 규칙 위반

```bash
# 해결 방법
npm run lint:fix
# 코드 수정, 규칙 예외 처리
```

#### 모듈 해석 에러

```bash
# 해결 방법
# import/export 구문 수정, 경로 확인
# 순환 참조 확인
```

#### 런타임 에러

```bash
# 해결 방법
# 브라우저 디버깅, 코드 로직 수정
# 브라우저 콘솔 에러 확인
```

### 데이터 동기화 관련 문제들

#### 동기화 모달이 표시되지 않는 경우

**증상**: 로그인 후 동기화 모달이 나타나지 않음

**원인 및 해결방법**:

1. **`getSession` 타임아웃**

   ```bash
   # 콘솔에서 확인할 수 있는 에러
   # "getSession 타임아웃 (5초)"

   # 해결방법: 네트워크 연결 확인, Supabase 서비스 상태 확인
   ```

2. **로컬 데이터 로드 실패**

   ```bash
   # 콘솔에서 확인할 수 있는 로그
   # "localStorage 데이터 로딩 완료: null"

   # 해결방법: localStorage에 데이터가 있는지 확인
   # 개발자 도구 > Application > Local Storage 확인
   ```

3. **서버 데이터 조회 실패**
   ```bash
   # 해결방법: Supabase 연결 상태 확인
   # 환경변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 확인
   ```

#### 동기화 중 무한 로딩

**증상**: 동기화 모달에서 선택 후 무한 로딩 상태

**해결방법**:

```bash
# 1. 네트워크 탭에서 API 요청 상태 확인
# 2. Supabase RLS 정책 확인
# 3. 사용자 인증 상태 확인
```

#### 데이터 손실 문제

**증상**: 동기화 후 기존 데이터가 사라짐

**해결방법**:

```bash
# 1. localStorage 백업 확인
# 2. 동기화 액션 로그 확인
# 3. 서버 데이터 백업 확인
```

#### 타임아웃 에러

**증상**: `getSession 타임아웃 (5초)` 에러

**해결방법**:

```bash
# 1. 네트워크 연결 상태 확인
# 2. Supabase 서비스 상태 확인
# 3. 타임아웃 시간 조정 (필요시)
```

### 디버깅 팁

1. **브라우저 개발자 도구 활용**
2. **console.log로 데이터 플로우 추적**
3. **React DevTools로 컴포넌트 상태 확인**
4. **네트워크 탭에서 모듈 로딩 확인**

### 데이터 동기화 디버깅 팁

1. **동기화 상태 추적**

   ```javascript
   // 브라우저 콘솔에서 실행
   console.log("로컬 데이터:", localStorage.getItem("classPlannerData"));
   console.log("개별 키들:", {
     sessions: localStorage.getItem("sessions"),
     students: localStorage.getItem("students"),
     subjects: localStorage.getItem("subjects"),
     enrollments: localStorage.getItem("enrollments"),
   });
   ```

2. **Supabase 연결 상태 확인**

   ```javascript
   // 브라우저 콘솔에서 실행
   console.log("Supabase 클라이언트:", window.supabase);
   ```

3. **동기화 모달 상태 확인**

   ```javascript
   // React DevTools에서 확인
   // DataSyncModal 컴포넌트의 props와 state 확인
   ```

4. **네트워크 요청 모니터링**
   - 개발자 도구 > Network 탭
   - Supabase API 요청 상태 확인
   - `getSession`, `user_data` 테이블 조회 요청 확인

---

## 📚 참고 자료

### 공식 문서

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vite Configuration](https://vitejs.dev/config/)

### 모범 사례

- [React Best Practices](https://react.dev/learn)
- [TypeScript Best Practices](https://github.com/typescript-eslint/typescript-eslint)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Atomic Design Methodology](https://bradfrost.com/blog/post/atomic-web-design/)

---

## 📅 문서 업데이트 이력

- **2024-12-17**: 드래그 앤 드롭 충돌 해결 로직 완전 구현 및 시스템 개선 (커밋: 43f7d89)

  - **학생 드래그로 수업 추가 시 충돌 해결 로직 구현**: 학생을 드래그하여 수업을 추가할 때도 기존 세션과의 충돌을 자동으로 해결
  - **우선순위 기반 세션 재배치 시스템 완성**: 새로 추가된 세션이 우선순위를 가지며, 충돌하는 기존 세션들이 아래로 밀려남
  - **addSession 함수에 충돌 해결 로직 통합**: setTimeout을 활용한 비동기 충돌 해결 구현
  - **enrollment 정보 누락 문제 해결**: 충돌 해결 과정에서 새로 생성된 enrollment가 세션과 올바르게 연결되도록 수정
  - **타입 안전성 개선**: enrollmentIds, newEnrollments 타입을 명시적으로 정의하여 TypeScript 오류 해결
  - **불완전한 세션 필터링 문제 해결**: useDisplaySessions에서 세션을 "불완전한 세션"으로 잘못 판단하는 문제 해결
  - **보안 및 로깅 시스템 강화**: 새로운 로깅 시스템(logger.ts), API 보안 강화(apiSecurity.ts), 에러 추적 시스템(errorTracker.ts) 구현
  - **CORS 미들웨어 구현**: API 보안을 위한 CORS 설정 자동화
  - **문서화 개선**: LOGGING_GUIDE.md, SECURITY_GUIDE.md 추가로 개발자 가이드 완성
  - **테스트 코드 업데이트**: 모든 테스트 코드를 새로운 로직에 맞게 업데이트
  - **사용자 경험 개선**: 세션 드래그와 학생 드래그 모두에서 동일한 충돌 해결 로직 적용

- **2024-12-XX**: 전역 기본 과목 초기화 시스템 및 보안 강화 구현

  - **전역 기본 과목 초기화 시스템**: `useGlobalSubjectInitialization` 훅을 통한 어느 페이지에서든 기본 과목 자동 생성
  - **브라우저 독립적 동작**: Chrome, Firefox, Safari 등 모든 브라우저에서 동일하게 동작
  - **서버 기반 중복 방지**: localStorage 대신 Supabase 데이터베이스를 기준으로 중복 실행 방지
  - **보안 강화**: Supabase Auth의 `getSession()`을 사용한 토큰 유효성 검증으로 토큰 탈취 공격 방지
  - **사용자 경험 개선**: 초기화 중 로딩 표시 및 자동 실행으로 사용자 개입 없이 기본 과목 생성
  - **일관성 보장**: 모든 페이지에서 동일한 기본 과목 목록 사용 (초등수학, 중등수학, 중등영어, 중등국어, 중등과학, 중등사회, 고등수학, 고등영어, 고등국어)
  - **RootLayout 통합**: App Layout에서 전역적으로 기본 과목 초기화 관리

- **2024-12-XX**: 드래그 앤 드롭 충돌 해결 로직 개선

  - **충돌 감지 로직 정상화**: `isTimeOverlapping`과 `findCollidingSessions` 함수가 정상적으로 작동하여 충돌하는 세션들을 정확히 감지
  - **자리 바꾸기 로직 구현**: 세션을 드래그하여 다른 위치에 드롭할 때 충돌하는 세션들을 아래로 밀어내는 로직 구현
  - **로직 충돌 해결**: `repositionSessions`와 `fillGapsAfterMove` 함수 간의 상충 문제 해결
  - **효율적인 재배치**: 충돌하는 세션들을 yPosition별로 그룹화하여 가장 낮은 사용 가능한 위치에 배치
  - **디버깅 로그 추가**: 충돌 감지, 세션 그룹화, 재배치 과정을 추적할 수 있는 상세한 로그 추가
  - **사용자 경험 개선**: 세션 드래그 앤 드롭 시 충돌이 자동으로 해결되어 겹치지 않는 깔끔한 시간표 구성

- **2024-12-XX**: 드래그 앤 드롭 문제 완전 해결

  - **핵심 문제 해결**: `display: none` → `visibility: hidden` 변경으로 드래그 이벤트 중단 문제 해결
  - **드래그 이벤트 정상 처리**: `visibility: hidden`은 요소를 보이지 않게 하지만 드래그 이벤트는 정상적으로 처리
  - **공간 유지**: 드래그 중인 세션이 보이지 않지만 공간은 유지되어 레이아웃이 깨지지 않음
  - **z-index 계층 구조 최적화**: 드래그 중 드롭존과 세션 블록의 z-index 조정
  - **드롭존 z-index**: 드래그 중일 때 10, 평상시 1
  - **세션 블록 z-index**: 드래그 중일 때 다른 세션들 0, 드래그된 세션 1000+, 평상시 1000+
  - **pointer-events 조정**: 드래그 중일 때 다른 세션들에 `pointerEvents: "none"` 설정
  - **드롭 효과 설정**: DropZone에서 `e.dataTransfer.dropEffect = "move"` 명시적 설정
  - **드래그 이벤트 전파**: 세션이 있는 영역에서도 드롭존이 드래그 이벤트를 받을 수 있도록 개선
  - **사용자 경험 개선**: 세션이 있는 드롭존 영역에서도 드래그 오버 시 파란색 점선 테두리 표시
  - **디버깅 로그 정리**: 문제 해결 후 모든 디버깅 로그 제거하여 코드 정리

- **2024-12-XX**: 전역 드래그 상태 기반 투명도 조정 기능 구현

  - **드래그 상태 전달 체인**: TimeTableGrid → TimeTableRow → SessionBlock → SessionBlock.utils.ts
  - **투명도 조정 로직**: 드래그 중 다른 세션들 투명도 조정 (드래그된 세션: 0.7, 다른 세션: 0.3)
  - **부드러운 전환 효과**: `transition: "opacity 0.2s ease-in-out"` 추가
  - **사용자 경험 개선**: 드롭존 프리뷰가 다른 세션들에 가려지지 않아 더 잘 보임
  - **모바일 호환성**: 터치 드래그 시에도 동일한 투명도 효과 적용
  - **타입 안전성**: TypeScript로 드래그 상태 props 타입 정의

- **2024-12-XX**: TypeScript 및 테스트 시스템 완전 개선

  - **TypeScript 구조적 문제 해결**: Domain 엔티티와 Application 계층 간 타입 호환성 개선
  - **ESLint 설정 최적화**: TypeScript 지원 강화 및 코드 품질 규칙 적용
  - **테스트 데이터 표준화**: 모든 테스트에서 유효한 UUID 사용으로 일관성 확보
  - **Repository Mock 전략**: API Routes 테스트에서 Repository Factory 직접 Mock
  - **테스트 안정성 향상**: 일관된 Mock 데이터와 예측 가능한 테스트 결과
  - **Pre-commit 훅 강화**: TypeScript, ESLint, 테스트 검증 자동화
  - **Clean Architecture 강화**: Domain Value Objects와 Application Plain Objects 명확한 구분

- **2024-12-XX**: Next.js + Clean Architecture 구조로 완전 전환

  - Vite + React Router → Next.js App Router 전환
  - Clean Architecture 패턴 적용 (Domain, Application, Infrastructure 계층)
  - Atomic Design 구조 유지 및 개선
  - API Routes를 Next.js 방식으로 변경
  - 환경 변수 처리 Next.js 방식으로 변경 (`process.env.NEXT_PUBLIC_`)
  - 테스트 전략을 계층별로 구분하여 명확화
  - 문서 구조를 새로운 아키텍처에 맞게 완전 업데이트

- **2024-12-XX**: 포괄적인 테스트 시스템 구축 완료

  - **Domain 계층 테스트**: 엔티티 및 값 객체의 순수한 단위 테스트
  - **Application 계층 테스트**: Mock을 사용한 유스케이스 및 서비스 테스트
  - **Infrastructure 계층 테스트**: Supabase 리포지토리 통합 테스트
  - **Presentation 계층 테스트**: React 컴포넌트 단위 테스트
  - **API Routes 테스트**: Next.js API Routes HTTP 테스트
  - **E2E 테스트**: Playwright를 사용한 사용자 시나리오 테스트
  - **통합 테스트**: 전체 플로우 테스트 및 에러 처리 검증
  - 테스트 커버리지 목표 설정 및 자동화된 테스트 실행 환경 구축

- **2024-01-XX**: 사용자 중심 데이터 동기화 로직 구현 완료
  - 새로운 동기화 시나리오 추가 (`localOnlyFirstLogin`, `localAndServerConflict`)
  - 사용자 선택 후에만 로컬 데이터 삭제하는 로직 구현
  - 명확한 선택 옵션과 경고 메시지 제공
  - `getSession` 타임아웃 처리 강화
  - 통합된 localStorage 데이터 로드 기능 추가

---

_이 문서는 지속적으로 업데이트되어야 하며, 팀원 모두가 공유하여 사용해야 합니다._
