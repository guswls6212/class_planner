# 개발자 가이드

## 📋 개요

이 문서는 클래스 플래너 프로젝트의 개발자를 위한 종합 가이드입니다. 프로젝트 구조, 개발 프로세스, 에러 방지 방법 등을 포함합니다.

---

## 🏗️ 프로젝트 구조

### 📁 디렉토리 구조 (Atomic Design 패턴)

```
frontend/
├── src/
│   ├── components/
│   │   ├── atoms/          # 원자 컴포넌트 (Button, Input, Label 등)
│   │   ├── molecules/     # 분자 컴포넌트 (FormField, SessionBlock 등)
│   │   └── organisms/     # 유기체 컴포넌트 (TimeTableGrid, StudentPanel 등)
│   ├── pages/             # 페이지 컴포넌트 (Schedule, Students, Manual)
│   ├── hooks/             # 커스텀 훅 (useStudentManagement, useDisplaySessions 등)
│   ├── types/             # 타입 정의 파일 (scheduleTypes, studentsTypes, apiTypes)
│   ├── lib/               # 유틸리티 함수 (planner, pdf-utils, build-info)
│   ├── contexts/          # React Context (ThemeContext)
│   └── utils/             # API 클라이언트 및 유틸리티 (apiClient)
├── api/                   # Vercel 서버리스 함수 (TypeScript)
│   └── students/          # 학생 관리 API (add.ts, list.ts, delete.ts)
├── scripts/               # 빌드 및 배포 스크립트
├── public/                # 정적 파일
├── vercel.json            # Vercel 배포 설정
├── supabase-schema-simple.sql # Supabase 데이터베이스 스키마
└── docs/                  # 문서 (통합됨)
```

### 🎯 주요 페이지 및 컴포넌트 구조

#### **Students 페이지** (`/students`)

**파일 구조:**

- `src/pages/Students.tsx` - 메인 페이지 컴포넌트
- `src/hooks/useStudentManagement.ts` - 학생 CRUD 로직
- `src/hooks/useSubjectInitialization.ts` - 과목 초기화 로직
- `src/hooks/useLocal.ts` - localStorage 관리
- `src/types/studentsTypes.ts` - 학생 관련 타입 정의
- `src/components/organisms/StudentsPageLayout.tsx` - 페이지 레이아웃
- `src/components/organisms/StudentManagementSection.tsx` - 학생 관리 섹션

**주요 기능:**

- 학생 관리 (추가, 삭제, 선택)
- 기본 과목 자동 생성
- localStorage 데이터 저장/복원
- 학생 목록 카드 배경색 통일 (과목 네비게이션과 일치)
- 학생 이름 입력창 검색 기능 통합

#### **Subjects 페이지** (`/subjects`)

**파일 구조:**

- `src/pages/Subjects.tsx` - 메인 페이지 컴포넌트
- `src/hooks/useSubjectManagement.ts` - 과목 CRUD 로직
- `src/hooks/useGlobalSubjects.ts` - 전역 과목 상태 관리
- `src/types/subjectsTypes.ts` - 과목 관련 타입 정의
- `src/components/organisms/SubjectsPageLayout.tsx` - 페이지 레이아웃
- `src/components/organisms/SubjectManagementSection.tsx` - 과목 관리 섹션
- `src/components/molecules/SubjectInputSection.tsx` - 과목 입력 섹션
- `src/components/molecules/SubjectList.tsx` - 과목 목록
- `src/components/atoms/SubjectListItem.tsx` - 과목 아이템

**주요 기능:**

- 과목 관리 (추가, 삭제, 편집, 선택)
- 색상 선택 기능
- 실시간 검색 기능
- localStorage 데이터 저장/복원
- 학생 네비게이션과 일치하는 디자인

#### **Schedule 페이지** (`/schedule`)

**파일 구조:**

- `src/pages/Schedule.tsx` - 메인 페이지 컴포넌트
- `src/hooks/useDisplaySessions.ts` - 세션 표시 로직
- `src/hooks/useStudentPanel.ts` - 학생 패널 상태 관리
- `src/hooks/useTimeValidation.ts` - 시간 검증 로직
- `src/types/scheduleTypes.ts` - 스케줄 관련 타입 정의
- `src/components/organisms/StudentPanel.tsx` - 학생 패널 컴포넌트
- `src/components/molecules/PDFDownloadButton.tsx` - PDF 다운로드 버튼

**주요 기능:**

- 시간표 표시 (9:00-23:00, 30분 단위)
- 드래그 앤 드롭으로 수업 추가
- 수업 편집 및 삭제
- 학생별 필터링
- PDF 다운로드
- 로그인 기능 제거 (전역 네비게이션으로 이동)

#### **Manual 페이지** (`/manual`)

- 사용자 매뉴얼 표시
- 배포 상태 확인

### 🔧 백엔드 및 배포 구조

#### **Vercel 서버리스 함수** (`/api`)

**파일 구조:**

- `api/students/add.ts` - 학생 추가 API
- `api/students/list.ts` - 학생 목록 조회 API
- `api/students/delete.ts` - 학생 삭제 API
- `vercel.json` - Vercel 배포 설정

**주요 기능:**

- TypeScript 기반 서버리스 함수
- Supabase JSONB 데이터베이스 연동
- CORS 헤더 자동 설정
- 환경 변수 기반 설정

#### **소셜 로그인 및 데이터 동기화 시스템**

**파일 구조:**

- `src/components/atoms/LoginButton.tsx` - 로그인 버튼 컴포넌트
- `src/components/atoms/LoginButton.module.css` - 로그인 버튼 스타일
- `src/components/molecules/DataSyncModal.tsx` - 데이터 동기화 모달
- `src/components/molecules/UpgradeModal.tsx` - 유료 전환 유도 모달
- `src/hooks/useDataSync.ts` - 데이터 동기화 로직
- `src/hooks/useFeatureGuard.ts` - 기능 제한 및 업그레이드 유도
- `src/hooks/useStaleWhileRevalidate.ts` - 캐시 전략 구현
- `src/hooks/useDebouncedSave.ts` - DB 쓰기 최적화
- `src/types/dataSyncTypes.ts` - 데이터 동기화 타입 정의
- `src/lib/dataSyncUtils.ts` - 데이터 동기화 유틸리티
- `src/lib/debounceUtils.ts` - Debounce 유틸리티
- `src/utils/supabaseClient.ts` - Supabase 클라이언트 설정

**주요 기능:**

- Google OAuth 로그인
- Kakao OAuth 로그인
- 데이터 동기화 시나리오 처리 (신규 가입, 일반 로그인, 데이터 충돌)
- 유료 기능 제한 (무료: 학생 10명, 유료: 무제한)
- Stale-While-Revalidate 캐시 전략
- Debounced DB 쓰기 작업
- React.memo를 활용한 성능 최적화

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

- `useStudentManagement.ts` - 학생 관리 로직
- `useDisplaySessions.ts` - 세션 표시 로직
- `useLocal.ts` - localStorage 관리
- `useTimeValidation.ts` - 시간 검증 로직

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

### 반복 작업 방지 체크리스트

#### 수정 전

- [ ] 전체 파일 읽기 완료
- [ ] 현재 상태 정확히 파악
- [ ] 변경 계획 수립
- [ ] 백업 생성 (`git stash`)
- [ ] 사용자 요청 범위 확인

#### 수정 중

- [ ] 정확한 위치 식별
- [ ] 한 번에 하나의 작은 변경
- [ ] 각 변경 후 즉시 검증
- [ ] 의존성 관계 확인
- [ ] 요청받은 작업만 수행

#### 수정 후

- [ ] 변경사항 의도대로 적용 확인
- [ ] 연관 파일 영향도 확인
- [ ] 전체 테스트 스위트 실행
- [ ] 브라우저에서 동작 확인
- [ ] 사용자에게 결과 보고

---

## 🧪 테스트 전략

### 테스트 유형

- **단위 테스트**: 개별 컴포넌트/함수 테스트
- **통합 테스트**: 페이지 전체 기능 테스트
- **E2E 테스트**: 사용자 시나리오 테스트
- **성능 테스트**: 알고리즘 성능 검증
- **시간 검증 테스트**: 수업 추가/편집 모달의 시간 입력 검증
- **겹침 처리 테스트**: 동일 시간대 세션들의 개별 표시 테스트

### 테스트 실행 명령어

```bash
# 전체 테스트 실행
npm run test:run

# 특정 테스트 실행
npm run test:run -- Schedule.test.tsx

# 테스트 커버리지
npm run test:coverage

# 보호 테스트 (기존 기능 보호)
npm run protection-check
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

#### 데이터 동기화 및 유료화 기능

- [x] localStorage와 DB 간 데이터 동기화
- [x] 로그인 시 데이터 동기화 시나리오 처리
- [x] 데이터 충돌 해결 UI
- [x] 유료 기능 제한 시스템 (무료: 학생 10명)
- [x] 업그레이드 유도 모달
- [x] Stale-While-Revalidate 캐시 전략
- [x] Debounced DB 쓰기 작업
- [x] React.memo를 활용한 성능 최적화

#### 코드 구조 개선

- [x] Atomic Design 패턴 적용
- [x] 커스텀 훅 분리 (useStudentManagement, useDisplaySessions, useSubjectManagement 등)
- [x] 타입 정의 파일 분리 (scheduleTypes, studentsTypes, subjectsTypes)
- [x] 컴포넌트 계층 구조 정리
- [x] 재사용 가능한 로직 분리
- [x] 패널 위치 관리 전용 훅 (usePanelPosition)
- [x] 전역 과목 상태 관리 (useGlobalSubjects)
- [x] 과목 관리 전용 컴포넌트 구조

### 🚀 향후 개선 사항 (12개)

#### 높은 우선순위

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

**전체 진행률**: 100% (데이터 동기화 및 유료화 시스템 완료)

---

## 🔧 명령어 영향 범위

### 빌드 관련 명령어

| 명령어            | 영향 범위     | 주의사항                      |
| ----------------- | ------------- | ----------------------------- |
| `npm run build`   | 전체 프로젝트 | TypeScript 컴파일 + Vite 빌드 |
| `npm run dev`     | 개발 환경     | 핫 리로드 지원                |
| `npm run preview` | 빌드 결과물   | 배포 전 확인용                |

### 테스트 관련 명령어

| 명령어                     | 영향 범위   | 주의사항             |
| -------------------------- | ----------- | -------------------- |
| `npm run test:run`         | 전체 테스트 | 모든 테스트 실행     |
| `npm run protection-check` | 보호 테스트 | 기존 기능 보호       |
| `npm run test:coverage`    | 커버리지    | 테스트 커버리지 측정 |

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

### 디버깅 팁

1. **브라우저 개발자 도구 활용**
2. **console.log로 데이터 플로우 추적**
3. **React DevTools로 컴포넌트 상태 확인**
4. **네트워크 탭에서 모듈 로딩 확인**

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

_이 문서는 지속적으로 업데이트되어야 하며, 팀원 모두가 공유하여 사용해야 합니다._
