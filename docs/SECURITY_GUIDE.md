# 보안 가이드

## 📋 개요

이 문서는 클래스 플래너 프로젝트의 보안 설정 및 구현 방법을 설명합니다.

---

## 🔒 구현된 보안 기능

### 1. HTTPS 강제 (HTTP to HTTPS Redirect)

#### **설정 파일**

- `vercel.json`: Vercel 배포 시 HTTPS 강제
- `next.config.ts`: Next.js 레벨에서 보안 헤더 설정

#### **구현 내용**

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://class-planner.info365.studio/$1",
      "permanent": true,
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ]
    }
  ]
}
```

#### **효과**

- 모든 HTTP 요청이 HTTPS로 자동 리다이렉트
- 브라우저에서 "안전하지 않음" 경고 제거
- SEO 점수 향상
- 데이터 전송 시 암호화

### 2. CORS (Cross-Origin Resource Sharing) 설정

#### **허용된 도메인**

- **개발 환경**:
  - `http://localhost:*` (모든 포트 허용)
  - `http://127.0.0.1:*` (모든 포트 허용)
  - 특정 포트: `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`
- **프로덕션 환경**: `https://class-planner.info365.studio`, `https://www.class-planner.info365.studio`

#### **구현 파일**

- `src/middleware/cors.ts`: CORS 미들웨어
- `src/lib/apiSecurity.ts`: API 보안 유틸리티

#### **CORS 헤더**

```typescript
{
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24시간
  'Vary': 'Origin',
}
```

#### **적용된 API Routes**

- `/api/data` - 통합 데이터 관리
- `/api/students` - 학생 관리
- `/api/subjects` - 과목 관리
- `/api/sessions` - 세션 관리
- `/api/user-settings` - 사용자 설정

### 3. 보안 헤더

#### **적용된 보안 헤더**

```typescript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

#### **각 헤더의 역할**

- **Strict-Transport-Security**: HTTPS 강제 (1년간)
- **X-Content-Type-Options**: MIME 타입 스니핑 방지
- **X-Frame-Options**: 클릭재킹 공격 방지
- **X-XSS-Protection**: XSS 공격 방지
- **Referrer-Policy**: 리퍼러 정보 제한
- **Permissions-Policy**: 브라우저 기능 접근 제한

---

## 🚀 배포 시 보안 설정

### Vercel 배포 설정

#### **1. 도메인 설정**

- **프로덕션 도메인**: `class-planner.info365.studio`
- **서브도메인**: `class-planner.info365.studio`
- **메인 도메인**: `info365.studio`

#### **2. 환경 변수**

```bash
# 프로덕션 환경 변수
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

#### **3. Vercel 설정**

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

---

## 🧪 보안 테스트

### 테스트 스크립트

- `scripts/test-security.js`: 보안 설정 자동 테스트

### 테스트 항목

1. **CORS 차단 테스트**: 악성 도메인에서의 요청 차단 확인
2. **보안 헤더 테스트**: 모든 보안 헤더 존재 확인
3. **HTTPS 리다이렉트 테스트**: HTTP → HTTPS 자동 리다이렉트 확인

### 테스트 실행

```bash
# 개발 서버 실행
npm run dev

# 보안 테스트 실행 (별도 터미널)
node scripts/test-security.js
```

---

## 🔧 개발 환경 설정

### 로컬 개발 시 CORS 설정

```typescript
// src/middleware/cors.ts
const corsConfig = {
  development: {
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ],
  },
  production: {
    allowedOrigins: [
      "https://class-planner.info365.studio",
      "https://www.class-planner.info365.studio",
    ],
  },
};

// 개발 환경에서는 localhost의 모든 포트 허용
if (process.env.NODE_ENV === "development") {
  const isLocalhost =
    origin &&
    (origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      allowedOrigins.includes(origin));
}
```

### 환경별 동작

- **개발 환경**: `localhost`의 모든 포트에서 API 호출 허용 (포트 충돌 시 자동 대응)
- **프로덕션 환경**: `class-planner.info365.studio`에서만 API 호출 허용

---

## 🛡️ 보안 모범 사례

### 1. API 보안

- 모든 API Routes에 CORS 검증 적용
- OPTIONS 요청 처리
- 보안 헤더 자동 추가

### 2. 데이터 보호

- Supabase Service Role Key 사용 (RLS 우회)
- 사용자 인증 토큰 검증
- 민감한 데이터 암호화

### 3. 네트워크 보안

- HTTPS 강제 적용
- 보안 헤더로 브라우저 보호
- CORS로 도메인 기반 접근 제어

---

## 📊 보안 모니터링

### 로그 모니터링

```typescript
// CORS 차단 로그
console.log("🚫 CORS 차단:", {
  origin: request.headers.get("origin"),
  ip: request.ip,
  userAgent: request.headers.get("user-agent"),
  timestamp: new Date().toISOString(),
});
```

### 보안 이벤트 추적

- CORS 정책 위반 시도
- 허용되지 않은 도메인에서의 요청
- 보안 헤더 누락 감지

---

## 🚨 보안 사고 대응

### CORS 정책 위반

1. **감지**: 403 Forbidden 응답 로그 확인
2. **분석**: 요청 Origin 및 IP 주소 확인
3. **대응**: 필요시 IP 차단 또는 추가 도메인 허용

### DDoS 공격 대응

1. **Vercel 자동 보호**: Edge Network에서 자동 차단
2. **Rate Limiting**: 앱 레벨에서 추가 제한 (향후 구현)
3. **모니터링**: 비정상적인 트래픽 패턴 감지

---

## 📚 참고 자료

- [Vercel Security Headers](https://vercel.com/docs/concepts/edge-network/headers)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

---

## ✅ 보안 체크리스트

### 배포 전 확인사항

- [ ] HTTPS 강제 설정 확인
- [ ] CORS 도메인 설정 확인
- [ ] 보안 헤더 적용 확인
- [ ] 환경 변수 보안 확인
- [ ] API Routes CORS 적용 확인

### 정기 점검사항

- [ ] 보안 헤더 유효성 검사
- [ ] CORS 정책 검토
- [ ] 보안 로그 모니터링
- [ ] 의존성 보안 업데이트

---

_이 문서는 지속적으로 업데이트되어야 하며, 보안 정책 변경 시 반드시 검토해야 합니다._
