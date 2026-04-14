# F3: 에러 핸들링 체계화 설계 문서

**작성일:** 2026-04-15  
**상태:** 설계 초안 (구현 미착수)  
**연관 TASKS.md:** Phase 2B — 에러 핸들링 체계화

---

## 1. 현황 조사

### 1.1 API Routes 레이어

파일: `src/app/api/**/route.ts` (17개)

**공통 구조 (일관성 높음):**
```typescript
try {
  // 입력 검증 → 비즈니스 로직
  return NextResponse.json({ success: true, data: ... });
} catch (error) {
  logger.error("...", undefined, error as Error);
  return NextResponse.json({ success: false, error: "..." }, { status: 500 });
}
```

**에러 응답 포맷 3종 혼재:**

| 포맷 | 키 | 사용처 |
|---|---|---|
| 타입 A | `{ success: false, error: "message" }` | students, subjects, sessions, members |
| 타입 B | `{ success: false, message: "message" }` | students POST 비즈니스 에러 (`src/app/api/students/route.ts:64-68`) |
| 타입 C | `{ valid: false, reason: "code_string" }` | invites/check route |

**상태 코드 불일치:**
- `src/app/api/students/route.ts:65` — 중복 학생 → 409
- `src/app/api/invites/accept/route.ts:37,41` — 만료/사용된 토큰 → 410
- `src/app/api/subjects/route.ts` — 중복 과목 → **500** (버그: 비즈니스 에러인데 500)

**에러 메시지 노출 정책 불일치:**
- students POST: `error.message` 원본 그대로 클라이언트에 노출 (한국어)
- invites/accept: 상황별 한국어 메시지 노출
- 대부분: `"Failed to fetch ..."` 영어 제네릭 메시지

**`request.json()` 파싱 오류 묵시적 처리:**
```typescript
// src/app/api/invites/route.ts
const body = await request.json().catch(() => ({}));  // 파싱 실패 = 빈 객체로 처리
```

---

### 1.2 Application Services 레이어

파일: `src/application/services/*.ts` (5개)

**세 가지 불일치 패턴:**

**패턴 A — throw + re-throw** (`StudentApplicationService`, `SubjectApplicationService`):
```typescript
// src/application/services/StudentApplicationService.ts
async addStudent(...): Promise<Student> {
  try {
    if (isDuplicate) throw new Error("이미 존재하는 학생 이름입니다.");
    return await this.studentRepository.create(...);
  } catch (error) {
    logger.error("학생 추가 중 에러 발생:", undefined, error as Error);
    throw error;  // 다시 throw → API route까지 전파
  }
}
```

**패턴 B — silent fail** (같은 파일 `StudentApplicationService`):
```typescript
async getAllStudents(academyId: string): Promise<Student[]> {
  try {
    return await this.studentRepository.getAll(academyId);
  } catch (error) {
    logger.error("...", undefined, error as Error);
    return [];  // 에러 삼키고 빈 배열 반환 → 호출자는 DB 다운인지 진짜 0건인지 모름
  }
}
```

**패턴 C — 에러 처리 없음** (`SessionApplicationService`, `EnrollmentApplicationService`):
```typescript
// src/application/services/SessionApplicationService.ts
async getAllSessions(academyId: string): Promise<Session[]> {
  return this.sessionRepository.getAll(academyId);  // try/catch 없음
}
```

**한 서비스 안에서도 패턴이 혼재** — `StudentApplicationService`는 A와 B 모두 사용.

---

### 1.3 Domain 레이어

파일: `src/domain/entities/`, `src/domain/services/`

**긍정적:** ValidationResult 인터페이스와 에러 코드가 정의되어 있음:
```typescript
// src/domain/services/StudentDomainService.ts
{ isValid: false, errors: [{ field: 'name', message: '...', code: 'NAME_DUPLICATE' }] }
```

**문제:** 에러 코드(`NAME_DUPLICATE`, `NAME_REQUIRED` 등)가 Application/API 레이어까지 전파되지 않음.
API route에서 에러를 구분하려면 메시지 문자열 인클루드 검사에 의존:
```typescript
// src/app/api/students/route.ts:62-68
if (error instanceof Error && error.message.includes("이미 존재하는 학생 이름")) {
  return NextResponse.json({ success: false, message: error.message }, { status: 409 });
}
```

**커스텀 에러 클래스:** 없음. 전층에서 `throw new Error("message")`.

---

### 1.4 `apiSync.ts` — fire-and-forget 패턴

파일: `src/lib/apiSync.ts:14-26`

```typescript
function fireAndForget(promise: Promise<Response>, context: string): void {
  promise
    .then((res) => {
      if (!res.ok) {
        res.json().catch(() => null).then((body) => {
          logger.error(`apiSync ${context} 실패`, { status: res.status, body });
        });
      }
    })
    .catch((err) => {
      logger.error(`apiSync ${context} 네트워크 오류`, undefined, err as Error);
    });
}
```

사용: `syncStudentCreate`, `syncSessionCreate` 등 11개 함수 모두 fireAndForget 경유.

**의도된 설계:** localStorage SSOT 정책상 서버 동기화 실패가 로컬 상태를 롤백하지 않아야 함.  
**문제:** 연속 실패 시 (예: 네트워크 단절 상태에서 10건 추가) 사용자는 로컬에서 정상이라 믿지만 서버는 0건. 재방문 시 데이터 불일치 발생 가능.

---

### 1.5 Logger & ErrorTracker

**`src/lib/logger.ts`** — 잘 구현됨:
- LogLevel: ERROR / WARN / INFO / DEBUG
- 개발: 가독성 출력 / 프로덕션: JSON
- `apiRequest`, `apiResponse`, `performance`, `security`, `business` 전용 메서드 존재

**`src/lib/errorTracker.ts`** — 구현됨, 거의 미사용:
- ErrorCategory (9종), ErrorSeverity (4종) 정의
- 에러 빈도 추적, 최근 100개 저장
- `src/app/api/sessions/[id]/route.ts:3` — import 주석 처리됨 → 실제 사용처 없음

---

### 1.6 ErrorBoundary

파일: `src/components/atoms/ErrorBoundary.tsx`

- **범위:** `src/app/layout.tsx:151` — Navigation + main 전체 감싸는 레이아웃 레벨 1개만
- **캐치 대상:** React 렌더링 에러만. 이벤트 핸들러 / fetch / async 에러는 캐치 불가.
- **trackError 연결:** `useUserTracking`의 trackError 호출 (lib/errorTracker와 별개 경로)

---

### 1.7 UI 컴포넌트 에러 피드백 패턴

| 컴포넌트 | 에러 처리 | 사용자 피드백 |
|---|---|---|
| `src/app/invite/[token]/page.tsx:82-105` | setAcceptError 상태 | ✅ 인라인 에러 표시 |
| `src/app/settings/page.tsx:52-115` | logger만 | ❌ 없음 |
| `src/app/students/page.tsx:33-43` | logger만 | ❌ 없음 |
| `src/app/schedule/page.tsx` (일부) | alert() | ⚠️ alert (UX 불량) |
| `src/components/molecules/PDFDownloadButton.tsx:22-34` | console.error | ❌ 없음 |

**Toast 시스템 미완성:**
```typescript
// src/hooks/useTimeValidation.ts — dispatchToast 정의만 있음
window.dispatchEvent(new CustomEvent("toast", { detail: { type, message } }));
// 리스너(addEventListener("toast", ...))가 앱 어디에도 없음 → toast가 동작 안 함 (버그)
```

---

## 2. 문제점 목록

| # | 문제 | 증거 | 영향 |
|---|---|---|---|
| P1 | API 에러 응답 포맷 3종 혼재 | `error` vs `message` vs `reason` 키 | 프론트엔드가 키를 예측할 수 없음 |
| P2 | 상태 코드 불일치 (비즈니스 에러 → 500) | `subjects/route.ts` 중복 과목 → 500 | 클라이언트가 재시도/무시 여부 판단 불가 |
| P3 | 에러 코드 체계 미전파 | Domain에서 정의, API까지 닿지 않음 | 문자열 contains 의존 (`error.message.includes(...)`) |
| P4 | Application Service 에러 처리 3가지 혼재 | throw vs silent fail vs pass-through | 같은 패턴을 기대할 수 없음 |
| P5 | Toast 시스템 리스너 없음 | `useTimeValidation.ts` CustomEvent 발행만 있음 | 시간 검증 에러 토스트가 UI에 표시되지 않는 버그 |
| P6 | 대부분 UI 컴포넌트에서 에러 시 사용자 피드백 없음 | `settings/page.tsx`, `students/page.tsx` | 침묵적 실패 |
| P7 | errorTracker 미사용 | import 주석 처리됨 | 에러 빈도/패턴 분석 불가 |
| P8 | apiSync 연속 실패 가시성 없음 | fireAndForget → logger만 | 장시간 오프라인 후 데이터 불일치 가능 |

---

## 3. 설계 원칙 (레이어별 에러 처리 계약)

### 3.1 Domain 레이어
- **현행 유지:** ValidationResult 반환 패턴 유지 (throw 안 함)
- **추가:** 단, 불변 규칙 위반(엔티티 생성 실패)은 도메인 에러 클래스로 throw

### 3.2 Application Services
- **통일 규칙:**
  - 비즈니스 검증 실패 → 커스텀 에러 throw (에러 코드 포함)
  - 인프라(DB) 에러 → 래핑 후 throw (원본 보존)
  - **silent fail 금지** — `return []` / `return null` 은 정말 빈 결과일 때만
- **에러 코드 전파:** Domain ValidationResult의 code를 AppError에 실어서 전파

### 3.3 Infrastructure 레이어
- Supabase 에러 → AppError로 래핑 후 throw
- 에러 메시지에 원본 Supabase 에러 보존 (logging용)

### 3.4 API Routes
- **입력 검증 에러:** 400
- **권한 없음:** 403
- **리소스 없음:** 404
- **비즈니스 충돌:** 409 (예: 중복 이름, 이미 사용된 초대)
- **만료/소멸:** 410 (현행 유지)
- **서버 에러:** 500

**통일된 에러 응답 포맷:**
```typescript
// 성공
{ success: true, data: T }

// 에러
{
  success: false,
  error: {
    code: "STUDENT_NAME_DUPLICATE",  // 기계 판독용
    message: "이미 존재하는 학생 이름입니다.",  // 사용자 표시용 (선택)
  }
}
```

### 3.5 Presentation 레이어
- **에러 표시 정책:**
  - 폼 제출 실패 → inline error (setError 상태)
  - 데이터 로드 실패 → 인라인 에러 영역 또는 토스트
  - 치명적 렌더 에러 → ErrorBoundary fallback
- **fireAndForget 실패:**
  - 현행 유지 (localStorage SSOT 정책 존중)
  - 단, 연속 N회 실패 시 토스트로 "서버 동기화 실패" 표시 (N은 설계 결정 필요)
- **Toast 버그 수정:** `CustomEvent("toast")` 리스너를 layout에 추가 (P5 즉시 수정 가능)

---

## 4. 공통 유틸 제안 (`src/lib/errors/`)

```
src/lib/errors/
├── AppError.ts          # 기본 에러 클래스 (code, message, cause)
├── DomainErrors.ts      # 도메인 에러 목록 (NAME_DUPLICATE, NOT_FOUND, ...)
├── httpErrors.ts        # AppError → NextResponse 변환 헬퍼
└── index.ts
```

**AppError 기본 구조 (안):**
```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,    // 기계 판독용 (예: "STUDENT_NAME_DUPLICATE")
    message: string,                 // 사용자 표시용
    public readonly statusHint?: number,  // HTTP 상태 코드 힌트
    public readonly cause?: unknown  // 원인 에러 (Supabase 등)
  ) {
    super(message);
    this.name = "AppError";
  }
}

// API route 에서:
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.statusHint ?? 500 }
    );
  }
  logger.error("Unexpected error", undefined, error as Error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
    { status: 500 }
  );
}
```

---

## 5. 마이그레이션 계획 (단계적 전환)

> **원칙:** 한 레이어씩. 각 단계는 독립된 PR. 테스트 먼저.

### Step 1 — Toast 버그 수정 (P5, 즉시)
- `src/app/layout.tsx`에 `CustomEvent("toast")` 리스너 추가
- 별도 ToastProvider 컴포넌트 또는 레이아웃 내 상태로 구현
- 기존 `useTimeValidation.ts` 코드 변경 불필요

### Step 2 — `src/lib/errors/` 신규 (AppError, DomainErrors, httpErrors)
- 기존 코드 변경 없음. 유틸만 추가.
- 테스트: AppError 직렬화, toErrorResponse 동작 검증

### Step 3 — Application Services 통일
- StudentApplicationService: 패턴 A(throw)를 AppError로 교체, 패턴 B(silent fail) 제거
- SubjectApplicationService: 동일
- SessionApplicationService, EnrollmentApplicationService: try/catch + AppError 추가
- 각 서비스별 테스트 업데이트

### Step 4 — API Routes 응답 포맷 통일
- 모든 route의 catch 블록에 `toErrorResponse(error)` 적용
- 상태 코드 정합성 수정 (subjects 중복 → 409)
- `error`/`message`/`reason` 키 → `error.code` + `error.message` 통일

### Step 5 — UI 에러 피드백 추가
- settings/page.tsx, students/page.tsx: catch 블록에 토스트/setError 추가
- PDFDownloadButton: 에러 시 사용자 알림

### Step 6 — errorTracker 활성화 (선택)
- API routes의 catch 블록에서 trackError 호출
- 에러 카테고리 정보 함께 전달

---

## 6. Devil's Advocate

### 알려진 위험

1. **AppError 과도한 추상화**  
   simple error → 복잡한 에러 계층. 소규모 프로젝트에서 ROI가 낮을 수 있음.  
   → 완화: code 필드만 추가한 최소 AppError로 시작. 상속 계층 최소화.

2. **fireAndForget 정책과의 충돌**  
   에러를 throw로 통일하면 apiSync에서 catch가 필요해짐. 하지만 apiSync는 fire-and-forget 의도로 설계됨.  
   → 결정: apiSync 레이어는 현행 유지. 서비스/API route만 통일.

3. **마이그레이션 중 불일치 기간**  
   Step 3~5 진행 중엔 일부는 AppError, 일부는 generic Error. API route 처리 분기 로직 필요.  
   → toErrorResponse()가 instanceof 체크로 양쪽 처리.

4. **클라이언트 코드가 새 포맷에 즉시 의존**  
   응답 포맷 변경 후 프론트가 `data.error`를 보는 코드에서 `data.error.message`를 봐야 하므로 클라이언트 코드도 동시 업데이트 필요.  
   → Step 4 PR에서 API + 호출 UI 동시 수정 필수.

### 거절된 대안

- **Result<T, E> 패턴** — 타입 안전성은 높지만 기존 코드 전면 재작성 필요. 5명 사용자 규모 대비 오버엔지니어링.
- **tRPC** — API route 전체를 tRPC로 교체. 기술 스택 전환 리스크.
- **Sentry 즉시 연동** — 필요하지만 별도 Phase (로깅/모니터링 항목 3번에서 결정).

---

## 7. 오픈 질문 (사용자 결정 필요)

| # | 질문 | 선택지 |
|---|---|---|
| Q1 | AppError 에러 메시지 언어 정책 | (A) 한국어 (사용자 표시용, 클라이언트로 전달) / (B) 영어 (code만 전달, 프론트에서 i18n 메시지 매핑) |
| Q2 | fireAndForget 연속 실패 알림 기준 | (A) 현행 유지 (logger만) / (B) N회 연속 실패 시 토스트 표시 (N=?) |
| Q3 | errorTracker 활성화 범위 | (A) Step 6 포함 (API route 전체) / (B) 선택적 (CRITICAL 에러만) / (C) 다음 Phase로 연기 |
| Q4 | Toast UI 구현 방식 | (A) layout에 전역 CustomEvent 리스너 (기존 useTimeValidation 호환) / (B) React Context 기반 ToastProvider 신규 |
| Q5 | API 에러 응답에서 `message` 클라이언트 노출 | (A) 항상 노출 (한국어 UX 편의) / (B) 개발 환경만 노출 / (C) 노출 안 함 (code로만) |

---

## 8. Multi-Perspective Analysis

### 학원 운영자 관점
시간표 추가 중 네트워크가 끊겼을 때 "저장됐다"는 착각을 하면 안 됨. 현재는 로컬에 보이지만 서버엔 없는 상황이 침묵 속에 발생 가능. 최소한 "동기화 실패" 배지라도 표시하면 혼란 예방. 단, 너무 잦은 오류 알림은 불안감 유발.

### Maintainer 관점
6개월 후 새 개발자가 subjects 중복 에러가 500으로 오는 이유를 찾으려면 `subjects/route.ts` → `SubjectApplicationService.addSubject` → `studentApplicationService` 비교까지 파봐야 함. 통일된 AppError + toErrorResponse라면 route.ts 하나만 봐도 이해 가능.

### Operator 관점
현재 errorTracker는 주석 처리되어 있어 프로덕션 에러 빈도를 알 수 없음. Lightsail에서 도커 로그는 JSON으로 나오지만 에러 코드별 집계 쿼리가 없음. Step 6 활성화만으로도 에러 패턴 분석 가능해짐.

---

## 참조 파일

- `src/lib/apiSync.ts:14-26` — fireAndForget 구현
- `src/app/api/students/route.ts:62-68` — 에러 포맷 불일치 (message 키)
- `src/app/api/subjects/route.ts` — 중복 에러 → 500 버그
- `src/app/api/invites/check/route.ts` — reason 키 포맷
- `src/application/services/StudentApplicationService.ts` — 패턴 A+B 혼재
- `src/application/services/SessionApplicationService.ts` — 패턴 C (에러 처리 없음)
- `src/domain/services/StudentDomainService.ts` — ValidationResult + code 정의
- `src/lib/logger.ts`, `src/lib/errorTracker.ts` — 기반 인프라
- `src/components/atoms/ErrorBoundary.tsx` — layout 레벨 경계
- `src/hooks/useTimeValidation.ts` — toast CustomEvent 발행 (리스너 없음)
- `src/app/layout.tsx:151` — ErrorBoundary 적용 위치
