# 테스트 실행 명령어 가이드

## 📋 개요

이 문서는 균형잡힌 접근 + 안정성 중시 전략에 따른 3단계 테스트 스크립트 사용법을 설명합니다.

## 🚀 3단계 테스트 전략

### 1. 💨 **커밋 전 검증** (`npm run pre-commit`)

**목적**: 빠르고 핵심적인 검증으로 기본 품질 보장

**실행 시점**:
- 매번 커밋하기 전
- 개발 중 주요 변경사항 완료 후
- 빠른 피드백이 필요할 때

**포함 테스트**:
```bash
✅ TypeScript 타입 체크
✅ ESLint 자동 수정 및 검사
✅ 핵심 비즈니스 로직 테스트 (Domain + Application)
✅ API Routes 테스트
✅ 컴포넌트 기본 테스트
✅ 빌드 가능 여부 확인
```

**예상 소요 시간**: 1-3분

**사용법**:
```bash
# 기본 실행
npm run pre-commit

# 또는 직접 실행
./scripts/pre-commit-check.sh
```

### 2. 🎯 **PR 생성 전 검증** (`npm run pre-pr`)

**목적**: E2E 테스트 및 전체 통합 검증으로 완전한 기능 확인

**실행 시점**:
- Pull Request 생성 전
- 주요 기능 완성 후
- 배포 후보 브랜치 준비 시

**포함 테스트**:
```bash
✅ 커밋 전 검증 (기본 품질 보장)
✅ 전체 단위 테스트
✅ 실제 Supabase 통합 테스트
✅ 테스트 커버리지 측정
✅ 주요 E2E 시나리오 테스트
✅ 브라우저 호환성 테스트
✅ 프로덕션 빌드 검증
✅ 시스템 통합 테스트
```

**예상 소요 시간**: 5-15분

**사용법**:
```bash
# 기본 실행
npm run pre-pr

# 또는 직접 실행
./scripts/pre-pr-check.sh
```

**주의사항**:
- E2E 테스트 실패 시 사용자 선택으로 계속 진행 가능
- 네트워크 연결 필요 (Supabase 통합 테스트)

### 3. 🛡️ **배포 전 검증** (`npm run pre-deploy`)

**목적**: 모든 테스트 + 보안 + 성능 검증으로 배포 안정성 보장

**실행 시점**:
- 프로덕션/스테이징 배포 전
- 릴리스 준비 시
- 최종 품질 검증이 필요할 때

**포함 테스트**:
```bash
✅ PR 검증 (모든 이전 단계 포함)
✅ 전체 E2E 테스트 스위트
✅ 모든 브라우저 호환성 검증
✅ 실제 클라이언트 통합 테스트
✅ 시스템 레벨 테스트
✅ 성능 벤치마크 테스트
✅ 보안 취약점 검사 (npm audit)
✅ 환경 변수 및 설정 검증
✅ 데이터베이스 마이그레이션 상태 확인
✅ 최종 프로덕션 빌드 검증
✅ 빌드 결과물 무결성 검사
```

**예상 소요 시간**: 15-30분

**사용법**:
```bash
# 기본 실행 (환경 선택)
npm run pre-deploy

# 환경 변수로 직접 지정
DEPLOY_ENV=production npm run pre-deploy
DEPLOY_ENV=staging npm run pre-deploy

# 또는 직접 실행
./scripts/pre-deploy-check.sh
```

**배포 환경 선택**:
- `staging`: 스테이징 환경 (일부 실패 허용)
- `production`: 프로덕션 환경 (엄격한 검증)

## 📊 기존 스크립트와의 비교

### 기존 `prepare-commit` vs 새로운 스크립트

| 구분 | prepare-commit | pre-commit | pre-pr | pre-deploy |
|------|----------------|------------|--------|------------|
| **목적** | 기존 기능 보호 | 커밋 전 필수 검증 | PR 전 통합 검증 | 배포 전 완전 검증 |
| **소요시간** | 3-5분 | 1-3분 | 5-15분 | 15-30분 |
| **타입체크** | ❌ (주석처리) | ✅ | ✅ | ✅ |
| **단위테스트** | ✅ (계층별) | ✅ (핵심만) | ✅ (전체) | ✅ (전체) |
| **통합테스트** | ✅ (기본) | ❌ | ✅ (Supabase) | ✅ (전체) |
| **E2E테스트** | ❌ | ❌ | ✅ (주요) | ✅ (전체) |
| **빌드테스트** | ✅ | ✅ | ✅ | ✅ |
| **보안검사** | ❌ | ❌ | ❌ | ✅ |
| **성능테스트** | ❌ | ❌ | ❌ | ✅ |

## 🎯 권장 사용 패턴

### 개발 중 (매일)
```bash
# 코드 수정 후 빠른 확인
npm run pre-commit
```

### 기능 완성 후 (주 1-2회)
```bash
# PR 생성 전 종합 검증
npm run pre-pr
```

### 릴리스 준비 (월 1-2회)
```bash
# 배포 전 최종 검증
npm run pre-deploy
```

## 🔧 개별 테스트 명령어

### 단위 테스트
```bash
# 전체 단위 테스트
npm run test

# 특정 파일/패턴
npm run test -- StudentId.test.ts
npm run test -- src/domain/

# 감시 모드 (개발 중)
npm run test:watch

# 커버리지 포함
npm run test:coverage
```

### 통합 테스트
```bash
# Supabase 통합 테스트
npm run test:integration:real-supabase

# 실제 클라이언트 테스트
npm run test:real-client
```

### E2E 테스트
```bash
# 전체 E2E 테스트
npm run test:e2e

# UI 모드
npm run test:e2e:ui

# 헤드리스 모드
npm run test:e2e:headed

# 특정 시나리오
npm run test:e2e:real-scenarios
npm run test:e2e:browser-compatibility
```

### 시스템 테스트
```bash
# 시스템 테스트
npm run test:system

# 헤드리스 모드
npm run test:system:headless
```

### 기타 검증
```bash
# 타입 체크
npm run type-check

# 린트 검사
npm run lint
npm run lint:fix

# 빌드 테스트
npm run build
```

## 🚨 문제 해결

### 1. TypeScript 에러
```bash
# 타입 체크만 실행
npm run type-check

# 특정 파일 확인
npx tsc --noEmit src/specific-file.ts
```

### 2. E2E 테스트 실패
```bash
# UI 모드로 디버그
npm run test:e2e:ui

# 헤드리스 모드로 재실행
npm run test:e2e:headed
```

### 3. Supabase 연결 실패
```bash
# 환경 변수 확인
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 수동 연결 테스트
npm run test:integration:real-supabase
```

### 4. 빌드 실패
```bash
# 상세 빌드 로그
npm run build -- --debug

# 캐시 삭제 후 재빌드
rm -rf .next
npm run build
```

## 💡 최적화 팁

### 1. 개발 중 빠른 피드백
```bash
# 변경된 파일만 테스트
npm run test -- --changed

# 특정 패턴만
npm run test -- --testNamePattern="Student"
```

### 2. 병렬 실행
```bash
# 여러 테스트를 동시에
npm run test & npm run test:e2e:headed &
```

### 3. CI/CD 최적화
```bash
# GitHub Actions에서
- name: Pre-commit Check
  run: npm run pre-commit
  
- name: Pre-PR Check  
  run: npm run pre-pr
  if: github.event_name == 'pull_request'
  
- name: Pre-deploy Check
  run: DEPLOY_ENV=production npm run pre-deploy
  if: github.ref == 'refs/heads/main'
```

## 📚 관련 문서

- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [프로젝트 구조 가이드](./PROJECT_STRUCTURE.md)
- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)

---

**마지막 업데이트**: 2025-09-20  
**문서 버전**: v1.0.1  
**상태**: 실제 스크립트와 완전 동기화됨 ✅