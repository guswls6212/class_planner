# 로깅 가이드 (Vercel 환경 최적화)

## 📋 개요

이 문서는 Vercel 서버리스 환경에 최적화된 로깅 전략과 구현 방법을 설명합니다.

---

## 🎯 로깅 전략

### 1. 구조화된 로깅

Vercel Functions에서는 `console.log`가 자동으로 로그 시스템에 전송됩니다. 우리는 구조화된 JSON 로그를 사용하여 효율적인 모니터링을 구현합니다.

### 2. 환경별 로그 레벨

- **개발 환경**: DEBUG 레벨 (모든 로그 출력)
- **프로덕션 환경**: INFO 레벨 (중요한 로그만 출력)
- **환경 변수**: `LOG_LEVEL`로 제어 가능

### 3. 로그 분류

- **API 로그**: 요청/응답 추적
- **에러 로그**: 에러 추적 및 분류
- **성능 로그**: 응답 시간 모니터링
- **보안 로그**: 보안 이벤트 추적
- **비즈니스 로그**: 비즈니스 로직 추적

---

## 🛠️ 구현된 로깅 시스템

### 1. 기본 로거 (`src/lib/logger.ts`)

```typescript
import { logger } from "@/lib/logger";

// 기본 로깅
logger.info("사용자 로그인", { userId: "user123" });
logger.error("데이터베이스 연결 실패", { userId: "user123" }, error);
logger.warn("느린 응답 감지", { duration: 5000 });
logger.debug("디버그 정보", { requestId: "req123" });

// API 전용 로깅
logger.apiRequest("GET", "/api/data", { userId: "user123" });
logger.apiResponse("GET", "/api/data", 200, 150, { userId: "user123" });

// 성능 모니터링
logger.performance("데이터베이스 쿼리", 250, { query: "SELECT * FROM users" });

// 보안 이벤트
logger.security("CORS 정책 위반", { origin: "malicious-site.com" });

// 비즈니스 이벤트
logger.business("학생 추가", { studentId: "student123", userId: "user123" });
```

### 2. API 로깅 미들웨어 (`src/middleware/logging.ts`)

```typescript
import { withApiLogging } from "@/middleware/logging";

// 기본 API 로깅
export const GET = withApiLogging(async (request: NextRequest) => {
  // API 로직
});

// 상세 로깅 (요청/응답 본문 포함)
export const POST = withDetailedLogging(async (request: NextRequest) => {
  // API 로직
});

// 최소 로깅 (성능 최적화)
export const OPTIONS = withMinimalLogging(async (request: NextRequest) => {
  // API 로직
});
```

### 3. 에러 추적 시스템 (`src/lib/errorTracker.ts`)

```typescript
import {
  trackError,
  trackDatabaseError,
  trackAuthError,
} from "@/lib/errorTracker";

try {
  // 데이터베이스 작업
} catch (error) {
  trackDatabaseError(error, { userId, endpoint: "/api/data" });
}

try {
  // 인증 작업
} catch (error) {
  trackAuthError(error, { userId, ip: request.ip });
}
```

---

## 📊 로그 형식

### 개발 환경 로그

```
[2024-01-15T10:30:45.123Z] INFO: 사용자 로그인 | Context: {"userId":"user123","endpoint":"/api/auth"} | Metadata: {"loginMethod":"email"}
```

### 프로덕션 환경 로그 (JSON)

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": 2,
  "message": "사용자 로그인",
  "context": {
    "userId": "user123",
    "endpoint": "/api/auth",
    "method": "POST",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "metadata": {
    "loginMethod": "email",
    "duration": 150
  }
}
```

---

## 🔍 Vercel에서 로그 확인

### 1. Vercel 대시보드

1. Vercel 대시보드에 로그인
2. 프로젝트 선택
3. "Functions" 탭 클릭
4. 함수별 로그 확인

### 2. Vercel CLI

```bash
# 실시간 로그 확인
vercel logs --follow

# 특정 함수 로그 확인
vercel logs --function=api/data

# 시간 범위 지정
vercel logs --since=1h
```

### 3. 로그 필터링

Vercel 대시보드에서 다음 키워드로 필터링 가능:

- `ERROR`: 에러 로그만
- `WARN`: 경고 로그만
- `INFO`: 정보 로그만
- `DEBUG`: 디버그 로그만

---

## 📈 모니터링 및 알림

### 1. 에러 모니터링

```typescript
import { errorTracker } from "@/lib/errorTracker";

// 에러 통계 조회
const stats = errorTracker.getErrorStats();
console.log("에러 통계:", stats);

// 에러 패턴 분석
const patterns = errorTracker.analyzeErrorPatterns();
console.log("에러 패턴:", patterns);
```

### 2. 성능 모니터링

```typescript
// 느린 응답 감지
if (duration > 5000) {
  logger.warn("느린 응답 감지", { duration, threshold: 5000 });
}

// 메모리 사용량 모니터링
const memUsage = process.memoryUsage();
logger.info("메모리 사용량", {
  rss: memUsage.rss,
  heapUsed: memUsage.heapUsed,
  heapTotal: memUsage.heapTotal,
});
```

---

## 🚀 최적화 팁

### 1. 로그 레벨 최적화

```typescript
// 프로덕션에서는 DEBUG 로그 비활성화
if (process.env.NODE_ENV === "production") {
  logger.debug = () => {}; // 빈 함수로 대체
}
```

### 2. 로그 크기 최적화

```typescript
// 큰 객체는 요약해서 로깅
logger.info("사용자 데이터 조회", {
  userId,
  dataSize: JSON.stringify(data).length,
  recordCount: data.length,
});
```

### 3. 민감한 정보 보호

```typescript
// 비밀번호나 토큰은 로깅하지 않음
logger.info("사용자 로그인", {
  userId,
  loginMethod: "email",
  // password는 로깅하지 않음
});
```

---

## 🔧 설정 및 환경 변수

### 환경 변수

```bash
# Supabase 설정 (Next.js 방식)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 로그 레벨 설정
LOG_LEVEL=INFO  # DEBUG, INFO, WARN, ERROR

# 환경 설정
NODE_ENV=production
```

### 로그 레벨 설명

- **DEBUG**: 모든 로그 출력 (개발 환경)
- **INFO**: 일반적인 정보 로그 (기본값)
- **WARN**: 경고 및 보안 이벤트
- **ERROR**: 에러만 출력 (프로덕션 환경)

### Vercel 설정

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "LOG_LEVEL": "2"
  }
}
```

---

## 📝 로깅 모범 사례

### 1. 의미 있는 메시지

```typescript
// 좋은 예
logger.info("사용자 로그인 성공", { userId, loginMethod: "email" });

// 나쁜 예
logger.info("ok", { userId });
```

### 2. 적절한 로그 레벨

```typescript
// ERROR: 시스템 에러, 예외 상황
logger.error("데이터베이스 연결 실패", context, error);

// WARN: 주의가 필요한 상황
logger.warn("느린 응답 감지", { duration: 5000 });

// INFO: 일반적인 비즈니스 이벤트
logger.info("사용자 로그인", { userId });

// DEBUG: 개발/디버깅 정보
logger.debug("SQL 쿼리 실행", { query: "SELECT * FROM users" });
```

### 3. 컨텍스트 정보 포함

```typescript
// 요청 추적을 위한 컨텍스트
const context = {
  requestId: uuidv4(),
  userId: user?.id,
  endpoint: request.url,
  method: request.method,
  ip: request.ip,
  userAgent: request.headers.get("user-agent"),
};

logger.info("API 요청 시작", context);
```

---

## 🚨 주의사항

### 1. 로그 크기 제한

- Vercel Functions는 로그 크기에 제한이 있음
- 큰 객체는 요약해서 로깅
- 민감한 정보는 로깅하지 않음

### 2. 성능 영향

- 과도한 로깅은 성능에 영향
- 프로덕션에서는 필요한 로그만 출력
- 비동기 로깅 고려

### 3. 보안 고려사항

- 비밀번호, 토큰 등 민감한 정보 로깅 금지
- 사용자 개인정보 보호
- 로그 접근 권한 관리

---

## 📚 참고 자료

- [Vercel Functions 로깅](https://vercel.com/docs/functions/serverless-functions#logging)
- [Node.js 로깅 모범 사례](https://nodejs.org/en/docs/guides/logging/)
- [구조화된 로깅](https://www.elastic.co/guide/en/ecs/current/ecs-logging.html)

---

## ✅ 현재 구현 상태

### 🎯 완료된 기능

#### 1. 기본 로깅 시스템 ✅

- **위치**: `src/lib/logger.ts`
- **완료 항목**:
  - 구조화된 JSON 로그 출력
  - 환경별 로그 레벨 제어
  - API 전용 로깅 메서드
  - 성능 모니터링 지원
  - 보안 이벤트 추적

#### 2. API 로깅 미들웨어 ✅

- **위치**: `src/middleware/logging.ts`
- **완료 항목**:
  - 요청/응답 자동 로깅
  - 성능 측정 및 경고
  - 요청 ID 생성 및 추적
  - 에러 자동 추적
  - 다양한 로깅 옵션 제공

#### 3. 에러 추적 시스템 ✅

- **위치**: `src/lib/errorTracker.ts`
- **완료 항목**:
  - 에러 분류 및 카테고리화
  - 에러 발생 빈도 추적
  - 에러 패턴 분석
  - 심각한 에러 알림 시스템
  - 에러 통계 조회

#### 4. API Routes 적용 ✅

- **위치**: `src/app/api/data/route.ts`
- **완료 항목**:
  - 로깅 미들웨어 적용
  - 구조화된 로그 출력
  - 에러 추적 시스템 연동
  - 성능 모니터링

### 📊 로깅 통계

- **구현된 로그 타입**: 8개 (ERROR, WARN, INFO, DEBUG, API, PERFORMANCE, SECURITY, BUSINESS)
- **지원하는 로그 레벨**: 4개 (0-3)
- **에러 카테고리**: 9개 (AUTH, VALIDATION, DATABASE, NETWORK 등)
- **에러 심각도**: 4개 (LOW, MEDIUM, HIGH, CRITICAL)

### 🚀 최근 로깅 시스템 개선사항

#### **Vercel 환경 최적화**

- ✅ **구조화된 JSON 로그**: 프로덕션 환경에서 JSON 형식으로 로그 출력
- ✅ **개발 환경 최적화**: 개발 환경에서 가독성 좋은 포맷으로 로그 출력
- ✅ **로그 레벨 제어**: 환경 변수로 로그 레벨 동적 제어
- ✅ **성능 최적화**: 불필요한 로그 출력 방지

#### **에러 추적 및 모니터링**

- ✅ **에러 분류 시스템**: 에러를 카테고리별로 분류하여 추적
- ✅ **에러 빈도 모니터링**: 동일한 에러의 반복 발생 감지
- ✅ **에러 패턴 분석**: 시간대별 에러 발생 패턴 분석
- ✅ **심각한 에러 알림**: CRITICAL 레벨 에러에 대한 즉시 알림

#### **API 로깅 자동화**

- ✅ **미들웨어 기반 로깅**: API Routes에 자동으로 로깅 적용
- ✅ **요청/응답 추적**: 모든 API 요청과 응답을 자동으로 로깅
- ✅ **성능 측정**: API 응답 시간 자동 측정 및 경고
- ✅ **요청 ID 추적**: 각 요청에 고유 ID 부여하여 추적 가능

### 🎯 향후 확장 계획

#### **알림 시스템 연동**

- [ ] Slack 알림 연동
- [ ] 이메일 알림 시스템
- [ ] Discord 웹훅 연동

#### **로그 분석 도구**

- [ ] 로그 대시보드 구축
- [ ] 실시간 모니터링 시스템
- [ ] 로그 검색 및 필터링 기능

#### **성능 모니터링**

- [ ] APM (Application Performance Monitoring) 연동
- [ ] 메모리 사용량 모니터링
- [ ] CPU 사용량 추적

---

_이 문서는 지속적으로 업데이트되어야 하며, 로깅 정책 변경 시 반드시 검토해야 합니다._
