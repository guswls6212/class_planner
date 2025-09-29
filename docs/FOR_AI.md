# FOR AI - 프로젝트 가이드

## 📋 프로젝트 개요

**Class Planner**: Next.js + Atomic Design + Clean Architecture 기반 학원 시간표 관리 시스템

### 🏗️ 기술 스택

- **Frontend**: Next.js 15.5.2, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication)
- **Data Management**: 🆕 localStorage 직접 조작 + debounce 서버 동기화
- **Testing**: Vitest, Playwright, React Testing Library
- **Architecture**: Clean Architecture + Atomic Design
- **Styling**: Tailwind CSS 4.0

### 📁 주요 디렉토리

```
src/
├── app/                    # Next.js App Router (페이지 + API Routes)
├── components/             # Atomic Design (atoms/molecules/organisms)
├── domain/                 # Clean Architecture - Domain 계층
├── application/            # Clean Architecture - Application 계층
├── infrastructure/         # Clean Architecture - Infrastructure 계층
├── hooks/                  # React 커스텀 훅 (🆕 Local 버전 추가)
├── lib/                    # 유틸리티 함수 (🆕 localStorage CRUD 시스템)
└── shared/                 # 공유 타입 및 상수
```

## 🚀 권장 워크플로우

### 1. 🔄 **개발 중** (매번 커밋 시)

```bash
# 코드 수정 후
git add .
npm run pre-commit          # 1-3분 (타입체크, 린트, 핵심테스트, 빌드)
git commit -m "feat: 기능 설명"

# 프로젝트 구조 문서 최신화 (중요한 변경사항 있을 시)
# PROJECT_STRUCTURE.md 파일을 수동으로 업데이트하거나
# 다음 명령어로 구조 확인 후 문서 업데이트
tree src/ -I 'node_modules|.git|.next' -L 3 > temp_structure.txt
```

### 2. 🎯 **기능 완성 후** (매일)

```bash
# 기능 개발 완료 후
npm run pre-pr              # 5-15분 (전체테스트, E2E, 통합테스트)
# Pull Request 생성
```

### 3. 🛡️ **릴리스 준비** (릴리스할 시)

```bash
# 배포 전 최종 검증
npm run pre-deploy          # 15-30분 (보안, 성능, 완전검증)
# 배포 진행
```

## 📋 주요 명령어

### 테스트

```bash
npm run test                # 단위 테스트
npm run test:watch          # 개발 중 감시 모드
npm run test:e2e            # E2E 테스트
npm run test:coverage       # 커버리지 측정
```

### 개발

```bash
npm run dev                 # 개발 서버 시작
npm run build               # 프로덕션 빌드
npm run type-check          # TypeScript 타입 체크
npm run lint:fix            # ESLint 자동 수정
```

### 3단계 검증 스크립트 (개선됨)

```bash
npm run pre-commit          # 커밋 전 필수 검증 (1-3분) - 포트 충돌 해결
npm run pre-pr              # PR 전 통합 검증 (5-15분) - 자동 진행 모드
npm run pre-deploy          # 배포 전 완전 검증 (15-30분) - 서버 관리 개선
```

#### 🔧 서버 관리 명령어 (신규)
```bash
npm run server:start        # 개발 서버 시작 (포트 충돌 방지)
npm run server:stop         # 개발 서버 종료
npm run server:restart      # 개발 서버 재시작
npm run server:status       # 서버 상태 확인
npm run server:clean        # 포트 3000 정리
```

## 🎯 AI 명령어 처리 시 주의사항

### 1. **테스트 전략**

- **개발 중**: `pre-commit` 스크립트 사용 (빠른 검증)
- **기능 완성**: `pre-pr` 스크립트 사용 (통합 검증)
- **배포 준비**: `pre-deploy` 스크립트 사용 (완전 검증)

### 2. **아키텍처 준수**

- **Domain**: 비즈니스 로직, 엔티티, 값 객체
- **Application**: 유스케이스, 서비스, 매퍼
- **Infrastructure**: 외부 의존성, 리포지토리 구현
- **Presentation**: React 컴포넌트 (Atomic Design)

### 3. **코드 수정 시**

- **타입 안전성**: TypeScript 엄격 모드 준수
- **테스트**: 수정된 코드에 대한 테스트 작성/업데이트
- **문서**: 중요한 변경사항은 관련 문서 업데이트
- **스타일**: Tailwind CSS 사용, 인라인 스타일 금지

### 4. **파일 구조 변경 시**

- **PROJECT_STRUCTURE.md** 문서 업데이트 필수
- **Clean Architecture** 계층 분리 유지
- **Atomic Design** 컴포넌트 분류 준수

## 🔍 현재 프로젝트 상태

### ✅ 완료된 기능

- 학생 관리 (CRUD)
- 과목 관리 (CRUD)
- 시간표 관리 (드래그앤드롭)
- Supabase 통합
- 3단계 테스트 전략 구현
- Clean Architecture 구조
- Atomic Design 컴포넌트

### ✅ 완벽한 현재 상태

- **TypeScript 에러**: **0개** (완전 해결됨) ✅
- **ESLint 에러**: **0개** (완전 해결됨) ✅
- **테스트 통과**: **79/79개 (100%)** (완전 성공) ✅
- **빌드 상태**: **100% 성공** ✅
- **코드 품질**: **최고 수준** ✅

### 🎯 개발 우선순위

1. ✅ **완료**: TypeScript 타입 에러 수정 (0개 달성)
2. ✅ **완료**: 테스트 안정화 (100% 통과)
3. 성능 최적화 (지속적 개선)
4. 사용자 경험 개선 (지속적 개선)

## 📚 주요 문서

- `docs/TESTING_COMMANDS.md`: 테스트 실행 가이드
- `docs/PROJECT_STRUCTURE.md`: 프로젝트 구조 상세
- `docs/TESTING_STRATEGY.md`: 테스트 전략
- `docs/DEVELOPMENT_WORKFLOW.md`: 개발 워크플로우

## 🚀 **NEW** - localStorage 직접 조작 시스템 (2025-09-21)

### **🎯 핵심 개념**

1. **즉시 반응**: 모든 CRUD 작업이 localStorage 직접 조작으로 0ms 응답
2. **스마트 동기화**: 1분마다 debounce로 서버와 자동 동기화
3. **보안 강화**: 사용자 간 완전한 데이터 격리
4. **성능 최적화**: 불필요한 API 호출 제거
5. **🆕 스크롤 위치 보존**: 드래그앤드롭 후 스크롤 위치 자동 복원

### **🔧 새로운 파일들**

- `src/lib/localStorageCrud.ts` - 통합 CRUD 시스템
- `src/lib/debouncedServerSync.ts` - 서버 동기화 시스템
- `src/hooks/useStudentManagementLocal.ts` - 학생 관리 (Local)
- `src/hooks/useSubjectManagementLocal.ts` - 과목 관리 (Local)
- `src/hooks/useIntegratedDataLocal.ts` - 통합 데이터 (Local)

### **🆕 스크롤 위치 보존 시스템 (2025-09-29)**

#### **핵심 기능**

- **즉시 복원**: DOM 마운트 시 저장된 스크롤 위치로 즉시 이동
- **깜빡임 방지**: 09:00로 이동했다가 다시 돌아오는 현상 완전 제거
- **스마트 저장**: 5분 이내의 스크롤 위치만 복원하여 데이터 신선도 보장
- **에러 안전**: localStorage 오류 시에도 앱 정상 동작

#### **테스트 커버리지**

- **유닛 테스트**: `TimeTableGrid.scrollPosition.test.tsx` - 컴포넌트 레벨 테스트
- **통합 테스트**: `scrollPositionManager.test.ts` - 로직 레벨 테스트
- **E2E 테스트**: `scroll-position-preservation.spec.ts` - 사용자 시나리오 테스트
- **저장소 테스트**: `scrollPositionStorage.test.ts` - localStorage 관리 테스트

### **🆕 E2E 테스트 공용 설정 시스템 (2025-09-29)**

#### **핵심 개념**

1. **중앙화된 설정**: 모든 E2E 테스트가 공통 설정을 사용하여 일관성 보장
2. **자동 인증**: 테스트용 계정으로 자동 로그인하여 인증 문제 해결
3. **통합된 타임아웃**: 페이지별 적절한 타임아웃 설정으로 안정성 향상
4. **소스코드 일치**: 실제 컴포넌트의 placeholder와 선택자 사용

#### **주요 파일**

- `tests/e2e/config/e2e-config.ts` - E2E 테스트 공용 설정
- `playwright.config.ts` - Playwright 설정 (공용 설정 사용)

#### **공용 설정 내용**

```typescript
export const E2E_CONFIG = {
  TEST_USER_ID: "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391",
  TEST_EMAIL: "info365001.e2e.test@gmail.com",
  SUPABASE_TOKEN_KEY: "sb-kcyqftasdxtqslrhbctv-auth-token",
  BASE_URL: "http://localhost:3000", // E2E 테스트 전용 포트
  TIMEOUTS: {
    AUTH_WAIT: 15000,
    PAGE_LOAD: 10000,
    STUDENT_ADD_WAIT: 5000,
    STUDENT_VISIBLE_WAIT: 15000,
  },
};
```

#### **핵심 함수들**

- `setupE2EAuth(page, customData?)`: 테스트용 인증 및 기본 데이터 설정
- `loadPageWithAuth(page, path)`: 인증 후 페이지 로드
- `createAuthData(userId, email)`: 테스트용 인증 데이터 생성
- `createDefaultData()`: 기본 테스트 데이터 생성

#### **개선사항**

- **포트 통일**: 모든 E2E 테스트가 `localhost:3000` 사용
- **서버 관리**: `npm run dev` 실행 시 기존 프로세스 자동 종료
- **실제 소스코드 반영**: `"학생 이름 (검색 가능)"` 등 실제 placeholder 사용
- **성능 테스트 제거**: 실제 DB 사용 방지로 무료 플랜 보호

### **🆕 스크립트 시스템 개선 (2025-09-29)**

#### **핵심 개선사항**

1. **포트 충돌 해결**: 서버 관리자 시스템으로 포트 3000 충돌 완전 해결
2. **자동 진행 모드**: CI/CD 환경에서 사용자 입력 없이 자동 진행
3. **통합 에러 처리**: 일관된 에러 처리 및 사용자 경험 개선
4. **서버 생명주기 관리**: PID 추적 및 Graceful Shutdown 구현

#### **새로운 서버 관리 시스템**

- `scripts/server-manager.sh` - 통합 서버 관리 도구
- 포트 충돌 자동 감지 및 정리
- PID 파일 기반 정확한 프로세스 제어
- EXIT 트랩으로 안전한 cleanup 보장

#### **개선된 스크립트들**

- **pre-commit**: 통합된 에러 처리, 명확한 단계별 진행
- **pre-pr**: 자동 진행 모드, 서버 관리자 통합
- **pre-deploy**: 환경별 검증, 보안 강화, 빌드 결과물 검증

#### **CI/CD 지원**

```bash
# 자동 진행 모드 활성화
export AUTO_PROCEED=Y
npm run pre-pr
npm run pre-deploy
```

#### **해결된 주요 문제들**

- ✅ 포트 충돌 문제 (`Error: http://localhost:3000 is already used`)
- ✅ 사용자 입력 대기 문제 (CI/CD 환경에서 중단)
- ✅ 서버 종료 로직 불완전 (프로세스 남아있음)
- ✅ 에러 처리 일관성 부족

### **🔄 사용 방법**

```typescript
// 기존 방식 (레거시)
import { useStudentManagement } from "../../hooks/useStudentManagement";

// 새로운 방식 (권장) ⚡
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
```

---

## 💡 AI 명령어 처리 팁

1. **항상 워크플로우 준수**: 변경사항 규모에 맞는 검증 스크립트 실행
2. **문서 동기화**: 구조 변경 시 PROJECT_STRUCTURE.md 업데이트
3. **테스트 우선**: 기능 수정 시 관련 테스트 확인/업데이트
4. **아키텍처 일관성**: Clean Architecture 원칙 준수
5. **타입 안전성**: TypeScript 에러 해결 우선
6. **🆕 Local 훅 우선**: 새로운 기능은 localStorage 직접 조작 방식 사용

## 🌳 Git 브랜치 관리 규칙

### **Merge 전략**

#### **⚠️ 중요: 항상 Merge Commit 생성**

```bash
# ❌ Fast-forward 병합 (가지가 안 보임)
git merge feature-branch

# ✅ Merge commit 생성 (가지 구조 시각화)
git merge --no-ff feature-branch
```

#### **🔄 브랜치 병합 워크플로우**

```bash
# 1. feature 브랜치에서 작업 완료
git checkout feature/new-feature
npm run pre-commit && npm run pre-pr  # 검증

# 2. develop으로 이동
git checkout develop

# 3. Merge commit으로 병합 (가지 구조 유지)
git merge --no-ff feature/new-feature

# 4. 병합된 브랜치 삭제
git branch -d feature/new-feature
```

#### **📊 예상 Git 그래프**

```
      ┌─ feature/A ──┐
      │              ├─ merge commit
develop ├─ feature/B ──┤
      │              ├─ merge commit
      └─ feature/C ──┘
```

### **브랜치 명명 규칙**

- `feature/기능명`: 새로운 기능 개발
- `fix/버그명`: 버그 수정
- `refactor/개선명`: 코드 리팩토링
- `test/테스트명`: 테스트 관련 작업

---

**마지막 업데이트**: 2025-09-21  
**프로젝트 버전**: v0.1.0  
**상태**: localStorage 직접 조작 시스템 완성 🚀
