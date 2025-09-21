# 🔐 E2E 테스트 인증 설정 가이드

## 📋 개요

E2E 테스트에서 실제 구글 계정으로 자동 로그인하여 인증 문제를 해결하는 방법을 설명합니다.

## 🛠️ 설정 방법

### 1. 구글 테스트 계정 준비

**권장사항:**

- 실제 개인 계정 사용 금지
- 테스트 전용 구글 계정 생성
- 2단계 인증 비활성화 (테스트 편의성)

**테스트 계정 예시:**

```
이메일: classplanner.e2e.test@gmail.com
비밀번호: TestPassword123!
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.e2e` 파일 생성:

```bash
# .env.e2e
E2E_GOOGLE_EMAIL=classplanner.e2e.test@gmail.com
E2E_GOOGLE_PASSWORD=TestPassword123!
E2E_TEST_MODE=true
E2E_HEADLESS=false
```

### 3. Playwright 설정에 환경 변수 로드 추가

`playwright.config.ts`에 dotenv 설정:

```typescript
import { config } from "dotenv";
config({ path: ".env.e2e" });
```

## 🧪 E2E 테스트 실행 방법

### 개발 중 (빠른 테스트):

```bash
npm run test:e2e:auth
```

### PR 전 (전체 테스트):

```bash
npm run test:e2e:full
```

### 헤드리스 모드:

```bash
E2E_HEADLESS=true npm run test:e2e:auth
```

## 🔒 보안 고려사항

1. **실제 계정 정보 보호**:

   - `.env.e2e` 파일을 `.gitignore`에 추가
   - CI/CD에서는 환경 변수로 설정

2. **테스트 격리**:

   - 각 테스트 후 데이터 정리
   - 테스트 전용 Supabase 프로젝트 사용 권장

3. **계정 관리**:
   - 테스트 계정은 최소 권한만 부여
   - 정기적인 비밀번호 변경

## 🚨 문제 해결

### 로그인 실패 시:

1. 구글 계정 2단계 인증 확인
2. 계정 잠금 상태 확인
3. Supabase 프로젝트 설정 확인

### 테스트 불안정성:

1. `page.waitForLoadState("networkidle")` 추가
2. 적절한 타임아웃 설정
3. 재시도 로직 구현


