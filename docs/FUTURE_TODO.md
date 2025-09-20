# 🚀 Future TODO - 시스템 개선 및 최적화 계획

## 📋 개요

이 문서는 현재 개발 중인 시스템 개선사항들을 정리한 TODO 리스트입니다. 각 항목은 단계별로 적용하여 시스템의 안정성과 성능을 향상시키는 것을 목표로 합니다.

---

## 🎯 우선순위별 개선 항목

### 🔥 **HIGH PRIORITY** - 즉시 적용 필요

#### 1. **학생 데이터 조회 에러 해결**

- **문제**: `StudentId cannot be empty` 에러 발생
- **원인**: 데이터베이스에 빈 ID를 가진 학생 데이터 존재
- **해결방법**:
  - `SupabaseStudentRepository.ts`에서 빈 ID 필터링 로직 추가
  - `Student.restore()` 호출 전 ID 유효성 검증
  - 데이터 무결성 보장을 위한 마이그레이션 스크립트 작성

#### 2. **Repository 인터페이스 통일**

- **문제**: 인터페이스와 구현체 간 시그니처 불일치
- **해결방법**:
  - `StudentRepository` 인터페이스에 `userId` 파라미터 추가
  - 모든 Repository 메서드에 `userId` 전달 로직 구현
  - API 엔드포인트에서 올바른 `userId` 전달 보장

#### 3. **인증 토큰 관리 중앙화**

- **문제**: 여러 파일에서 중복된 토큰 관리 로직
- **해결방법**:
  - `AuthTokenManager` 클래스 완성 및 적용
  - 모든 API 호출에서 중앙화된 인증 헤더 사용
  - 토큰 만료 및 갱신 로직 구현

---

### 🟡 **MEDIUM PRIORITY** - 단계적 적용

#### 4. **로컬스토리지 데이터 구조 통합**

- **현재 상태**: 개별 키로 분산 저장
- **목표**: `classPlannerData` 단일 키로 통합
- **적용 파일**:
  - `src/lib/dataSyncUtils.ts`
  - `src/hooks/useStudentManagement.ts`
  - `src/hooks/useSubjectManagement.ts`
  - `src/hooks/useSessionManagement.ts`
  - `src/hooks/useEnrollmentManagement.ts`

#### 5. **Debounced Save 시스템 구현**

- **목표**: 사용자 액션을 배치로 모아서 서버 저장
- **구현 파일**:
  - `src/hooks/useDebouncedSave.ts`
  - `src/hooks/useGlobalOptimizedSave.ts`
  - `src/lib/debounceUtils.ts`

#### 6. **SWR (Stale While Revalidate) 패턴 적용**

- **목표**: 캐시 우선, 백그라운드 동기화
- **구현 파일**:
  - `src/hooks/useStaleWhileRevalidate.ts`
  - `src/hooks/useIntegratedData.ts`

---

### 🟢 **LOW PRIORITY** - 장기 개선

#### 7. **타임존 표준화**

- **목표**: 전체 시스템을 KST/JST로 통일
- **구현 파일**:
  - `src/lib/timeUtils.ts`
  - 모든 타임스탬프 생성 로직

#### 8. **데이터 동기화 전략 개선**

- **목표**: 로컬-서버 간 스마트 병합
- **구현 파일**:
  - `src/lib/dataSyncUtils.ts` - `mergeData` 함수
  - 아이템별 `lastModified` 메타데이터 활용

#### 9. **로그아웃 시 데이터 정리**

- **목표**: 사용자별 데이터 완전 삭제
- **구현 파일**:
  - `src/lib/logoutUtils.ts`
  - `src/components/atoms/LoginButton.tsx`

---

## 📁 **새로 생성된 파일들**

### 🔧 **핵심 유틸리티**

- `src/lib/authValidation.ts` - 인증 검증 로직
- `src/lib/timeUtils.ts` - 타임존 유틸리티
- `src/lib/logoutUtils.ts` - 로그아웃 정리 로직
- `src/lib/debugUtils.ts` - 디버깅 도구

### 🎣 **최적화 훅들**

- `src/hooks/useGlobalOptimizedSave.ts` - 전역 저장 최적화
- `src/hooks/useDebouncedSave.ts` - 디바운스 저장
- `src/hooks/useEnrollmentManagement.ts` - 수강 관리
- `src/hooks/useOptimizedCRUD.ts` - CRUD 최적화
- `src/hooks/useOptimizedSessionDrag.ts` - 세션 드래그 최적화
- `src/hooks/usePageVisibility.ts` - 페이지 가시성 관리

### 🎨 **UI 컴포넌트**

- `src/components/atoms/Toast.tsx` - 토스트 알림
- `src/components/atoms/SavingIndicator.tsx` - 저장 상태 표시
- `src/components/atoms/OptimizedDataIndicator.tsx` - 데이터 최적화 표시
- `src/components/atoms/GlobalSavingIndicator.tsx` - 전역 저장 표시

### 📊 **타입 정의**

- `src/types/dataSyncTypes.ts` - 데이터 동기화 타입

### 🛣️ **API 엔드포인트**

- `src/app/api/enrollments/` - 수강 관리 API

### 📚 **문서**

- `docs/OPTIMIZATION_GUIDE.md` - 최적화 가이드
- `docs/AUTH_VALIDATION_GUIDE.md` - 인증 검증 가이드
- `docs/CRUD_EXAMPLES.md` - CRUD 예제
- `docs/CRUD_OPTIMIZATION_FLOW.md` - CRUD 최적화 플로우
- `docs/STUDENTS_PAGE_CRUD_FLOW.md` - 학생 페이지 CRUD 플로우

---

## 🔄 **수정된 기존 파일들**

### 📡 **API 라우트**

- `src/app/api/data/route.ts` - 통합 데이터 API
- `src/app/api/students/route.ts` - 학생 API
- `src/app/api/students/[id]/route.ts` - 개별 학생 API
- `src/app/api/subjects/route.ts` - 과목 API
- `src/app/api/sessions/route.ts` - 세션 API
- `src/app/api/user-settings/route.ts` - 사용자 설정 API

### 🏗️ **인프라스트럭처**

- `src/infrastructure/interfaces.ts` - Repository 인터페이스
- `src/infrastructure/repositories/SupabaseStudentRepository.ts` - 학생 Repository
- `src/infrastructure/repositories/SupabaseSubjectRepository.ts` - 과목 Repository

### 🎣 **훅들**

- `src/hooks/useStudentManagement.ts` - 학생 관리
- `src/hooks/useSubjectManagement.ts` - 과목 관리
- `src/hooks/useSessionManagement.ts` - 세션 관리
- `src/hooks/useIntegratedData.ts` - 통합 데이터
- `src/hooks/useStaleWhileRevalidate.ts` - SWR 패턴

### 🧩 **컴포넌트**

- `src/components/atoms/AuthGuard.tsx` - 인증 가드
- `src/components/atoms/LoginButton.tsx` - 로그인 버튼

### 📄 **페이지**

- `src/app/students/page.tsx` - 학생 페이지
- `src/app/schedule/page.tsx` - 스케줄 페이지
- `src/app/layout.tsx` - 레이아웃

### 🔧 **유틸리티**

- `src/lib/dataSyncUtils.ts` - 데이터 동기화
- `src/lib/debounceUtils.ts` - 디바운스 유틸리티
- `src/lib/logger.ts` - 로깅
- `src/lib/errorTracker.ts` - 에러 추적
- `src/utils/supabaseClient.ts` - Supabase 클라이언트

### 🏢 **서비스**

- `src/application/services/StudentApplicationService.ts` - 학생 서비스
- `src/application/services/DataApplicationService.ts` - 데이터 서비스

---

## 🚀 **적용 순서 권장사항**

### **Phase 1: 기반 안정화**

1. 학생 데이터 조회 에러 해결
2. Repository 인터페이스 통일
3. 인증 토큰 관리 중앙화

### **Phase 2: 데이터 최적화**

4. 로컬스토리지 구조 통합
5. Debounced Save 시스템 구현
6. SWR 패턴 적용

### **Phase 3: 사용자 경험 개선**

7. 타임존 표준화
8. 데이터 동기화 전략 개선
9. 로그아웃 시 데이터 정리

---

## ⚠️ **주의사항**

- 각 단계별로 충분한 테스트 필요
- 데이터 마이그레이션 시 백업 필수
- 사용자 데이터 손실 방지를 위한 안전장치 구현
- 점진적 적용으로 시스템 안정성 보장

---

## 📝 **참고사항**

- 현재 `develop` 브랜치에서 작업 중
- 모든 변경사항은 `git restore` 명령으로 되돌릴 수 있음
- 향후 필요시 이 문서를 참조하여 단계별 적용 가능

---

**마지막 업데이트**: 2025-01-19  
**문서 버전**: v1.0.0  
**상태**: 개발 중 (모든 변경사항 되돌림 완료)
