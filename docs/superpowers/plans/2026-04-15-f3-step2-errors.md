# F3 Step 2: `src/lib/errors/` 인프라 구축 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/lib/errors/` 디렉토리를 신규 생성하여 `AppError`, 에러 코드 상수(`codes.ts`), 한국어 메시지 매핑(`messages.ko.ts`), HTTP 응답 직렬화 헬퍼(`httpErrors.ts`)를 추가한다. 기존 코드는 변경하지 않는다.

**Architecture:** 새로운 유틸 파일 5개만 추가하는 purely additive 작업. `AppError`는 에러 코드와 HTTP 상태 힌트를 보유하는 최소 커스텀 클래스. `toErrorResponse(error)`는 `AppError` 여부로 분기해 통일된 `{ success, error }` 포맷 `NextResponse`를 반환한다. 기존 route/service 코드는 Step 3~4에서 마이그레이션한다.

**Tech Stack:** TypeScript 5 strict, Next.js 15 (`NextResponse`), Vitest + React Testing Library

---

## 파일 구조

```
src/lib/errors/
├── codes.ts          # CREATE — 에러 코드 string literal union + 상수 객체
├── messages.ko.ts    # CREATE — ErrorCode → ko 문자열 Record + fallback 함수
├── AppError.ts       # CREATE — AppError 클래스 (code, statusHint, cause)
├── httpErrors.ts     # CREATE — toErrorResponse(error): NextResponse
└── index.ts          # CREATE — barrel export
src/lib/errors/__tests__/
├── codes.test.ts     # CREATE — 상수 값 존재 확인
├── messages.ko.test.ts  # CREATE — 매핑 조회 + fallback
├── AppError.test.ts  # CREATE — 클래스 생성 / instanceof / message lookup
└── httpErrors.test.ts   # CREATE — toErrorResponse 분기 (AppError / generic / dev details)
```

---

### Task 1: `codes.ts` — 에러 코드 상수 정의

**Files:**
- Create: `src/lib/errors/codes.ts`
- Create: `src/lib/errors/__tests__/codes.test.ts`

규칙: `{ENTITY}_{FIELD}_{RULE}` SNAKE_CASE. 미래 코드 추가 시 이 파일 + `messages.ko.ts` 동시 수정 필수.

현재 코드베이스에서 확인된 에러 상황:
- `StudentApplicationService`: 이미 존재하는 학생 이름, 존재하지 않는 학생
- `SubjectApplicationService`: 이미 존재하는 과목 이름, 존재하지 않는 과목
- `SessionApplicationService`: Session not found
- `invites/accept/route.ts`: 이미 사용된 초대, 만료된 초대, 멤버 등록 실패
- `invites/[id]/route.ts`: 이미 사용된 초대
- `invites/check/route.ts`: expired (토큰 만료)
- `invites/route.ts`: role 값 오류
- Domain `Student.ts`, `Subject.ts`: NAME_REQUIRED
- Domain `StudentDomainService.ts`: NAME_DUPLICATE

- [ ] **Step 1-1: `codes.ts` 작성**

```typescript
// src/lib/errors/codes.ts

export const ErrorCodes = {
  // Student
  STUDENT_NAME_REQUIRED: "STUDENT_NAME_REQUIRED",
  STUDENT_NAME_DUPLICATE: "STUDENT_NAME_DUPLICATE",
  STUDENT_NOT_FOUND: "STUDENT_NOT_FOUND",

  // Subject
  SUBJECT_NAME_REQUIRED: "SUBJECT_NAME_REQUIRED",
  SUBJECT_NAME_DUPLICATE: "SUBJECT_NAME_DUPLICATE",
  SUBJECT_NOT_FOUND: "SUBJECT_NOT_FOUND",

  // Session
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_TIME_INVALID: "SESSION_TIME_INVALID",
  SESSION_DURATION_EXCEEDED: "SESSION_DURATION_EXCEEDED",

  // Invite
  INVITE_TOKEN_EXPIRED: "INVITE_TOKEN_EXPIRED",
  INVITE_TOKEN_USED: "INVITE_TOKEN_USED",
  INVITE_ROLE_INVALID: "INVITE_ROLE_INVALID",
  INVITE_MEMBER_INSERT_FAILED: "INVITE_MEMBER_INSERT_FAILED",

  // General
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

- [ ] **Step 1-2: `codes.test.ts` 작성**

```typescript
// src/lib/errors/__tests__/codes.test.ts
import { describe, expect, it } from "vitest";
import { ErrorCodes, type ErrorCode } from "../codes";

describe("ErrorCodes", () => {
  it("각 코드의 키와 값이 동일해야 한다", () => {
    for (const [key, value] of Object.entries(ErrorCodes)) {
      expect(key).toBe(value);
    }
  });

  it("STUDENT_NAME_DUPLICATE 코드가 존재해야 한다", () => {
    expect(ErrorCodes.STUDENT_NAME_DUPLICATE).toBe("STUDENT_NAME_DUPLICATE");
  });

  it("INVITE_TOKEN_EXPIRED 코드가 존재해야 한다", () => {
    expect(ErrorCodes.INVITE_TOKEN_EXPIRED).toBe("INVITE_TOKEN_EXPIRED");
  });

  it("INTERNAL_ERROR 코드가 존재해야 한다", () => {
    expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });

  it("ErrorCode 타입이 union string literal이어야 한다", () => {
    const code: ErrorCode = "STUDENT_NAME_DUPLICATE";
    expect(typeof code).toBe("string");
  });
});
```

- [ ] **Step 1-3: 테스트 실행 (실패 확인)**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npx vitest run src/lib/errors/__tests__/codes.test.ts
```

Expected: 파일 없어서 FAIL (모듈 import 에러)

- [ ] **Step 1-4: 테스트 통과 확인**

`codes.ts` 저장 후 재실행:

```bash
npx vitest run src/lib/errors/__tests__/codes.test.ts
```

Expected: 5 tests passed

- [ ] **Step 1-5: 커밋**

```bash
git checkout -b feat/error-handling-step2-errors
git add src/lib/errors/codes.ts src/lib/errors/__tests__/codes.test.ts
git commit -m "feat(errors): add ErrorCodes constants and ErrorCode union type"
```

---

### Task 2: `messages.ko.ts` — 한국어 메시지 매핑

**Files:**
- Create: `src/lib/errors/messages.ko.ts`
- Create: `src/lib/errors/__tests__/messages.ko.test.ts`

`Record<ErrorCode, string>` 매핑 + 미매핑 코드를 위한 fallback 함수. 새 `ErrorCode`가 추가될 때 이 파일에도 동시 추가 필수.

- [ ] **Step 2-1: `messages.ko.ts` 작성**

```typescript
// src/lib/errors/messages.ko.ts
import type { ErrorCode } from "./codes";

const messages: Record<ErrorCode, string> = {
  // Student
  STUDENT_NAME_REQUIRED: "학생 이름을 입력해주세요.",
  STUDENT_NAME_DUPLICATE: "이미 존재하는 학생 이름입니다.",
  STUDENT_NOT_FOUND: "존재하지 않는 학생입니다.",

  // Subject
  SUBJECT_NAME_REQUIRED: "과목 이름을 입력해주세요.",
  SUBJECT_NAME_DUPLICATE: "이미 존재하는 과목 이름입니다.",
  SUBJECT_NOT_FOUND: "존재하지 않는 과목입니다.",

  // Session
  SESSION_NOT_FOUND: "존재하지 않는 수업입니다.",
  SESSION_TIME_INVALID: "종료 시간은 시작 시간보다 늦어야 합니다.",
  SESSION_DURATION_EXCEEDED: "세션 시간은 최대 8시간까지 설정할 수 있습니다.",

  // Invite
  INVITE_TOKEN_EXPIRED: "만료된 초대 링크입니다.",
  INVITE_TOKEN_USED: "이미 사용된 초대 링크입니다.",
  INVITE_ROLE_INVALID: "role은 'admin' 또는 'member'여야 합니다.",
  INVITE_MEMBER_INSERT_FAILED: "멤버 등록에 실패했습니다.",

  // General
  VALIDATION_FAILED: "입력값이 올바르지 않습니다.",
  UNAUTHORIZED: "로그인이 필요합니다.",
  FORBIDDEN: "접근 권한이 없습니다.",
  INTERNAL_ERROR: "서버 오류가 발생했습니다.",
};

/**
 * 에러 코드에 대응하는 한국어 메시지를 반환한다.
 * 미매핑 코드(string)는 fallback 메시지를 반환한다.
 */
export function getKoMessage(code: string): string {
  return (messages as Record<string, string>)[code] ?? "알 수 없는 오류가 발생했습니다.";
}

export default messages;
```

- [ ] **Step 2-2: `messages.ko.test.ts` 작성**

```typescript
// src/lib/errors/__tests__/messages.ko.test.ts
import { describe, expect, it } from "vitest";
import messages, { getKoMessage } from "../messages.ko";
import { ErrorCodes } from "../codes";

describe("messages.ko", () => {
  it("모든 ErrorCode가 messages에 매핑되어 있어야 한다", () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(messages).toHaveProperty(code);
      expect(typeof messages[code]).toBe("string");
      expect(messages[code].length).toBeGreaterThan(0);
    }
  });

  it("getKoMessage: 알려진 코드 — 올바른 메시지 반환", () => {
    expect(getKoMessage("STUDENT_NAME_DUPLICATE")).toBe("이미 존재하는 학생 이름입니다.");
    expect(getKoMessage("INVITE_TOKEN_EXPIRED")).toBe("만료된 초대 링크입니다.");
    expect(getKoMessage("INTERNAL_ERROR")).toBe("서버 오류가 발생했습니다.");
  });

  it("getKoMessage: 미매핑 코드 — fallback 메시지 반환", () => {
    expect(getKoMessage("UNKNOWN_FUTURE_CODE")).toBe("알 수 없는 오류가 발생했습니다.");
    expect(getKoMessage("")).toBe("알 수 없는 오류가 발생했습니다.");
  });
});
```

- [ ] **Step 2-3: 테스트 실행**

```bash
npx vitest run src/lib/errors/__tests__/messages.ko.test.ts
```

Expected: all passed

- [ ] **Step 2-4: 커밋**

```bash
git add src/lib/errors/messages.ko.ts src/lib/errors/__tests__/messages.ko.test.ts
git commit -m "feat(errors): add messages.ko with ko message mapping and fallback"
```

---

### Task 3: `AppError.ts` — 커스텀 에러 클래스

**Files:**
- Create: `src/lib/errors/AppError.ts`
- Create: `src/lib/errors/__tests__/AppError.test.ts`

`message`는 `messages.ko.ts`에서 자동 조회. `statusHint`는 HTTP 상태 코드 힌트 (API route가 `toErrorResponse`에서 사용). `cause`는 원본 에러 (Supabase 등) 보존.

- [ ] **Step 3-1: `AppError.ts` 작성**

```typescript
// src/lib/errors/AppError.ts
import type { ErrorCode } from "./codes";
import { getKoMessage } from "./messages.ko";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusHint: number;
  public readonly cause?: unknown;

  constructor(
    code: ErrorCode | string,
    options: {
      statusHint?: number;
      cause?: unknown;
      /** 메시지를 messages.ko 조회 대신 직접 지정할 때 사용 (테스트/특수 케이스만) */
      messageOverride?: string;
    } = {}
  ) {
    const message = options.messageOverride ?? getKoMessage(code);
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusHint = options.statusHint ?? 500;
    this.cause = options.cause;
  }
}
```

- [ ] **Step 3-2: `AppError.test.ts` 작성**

```typescript
// src/lib/errors/__tests__/AppError.test.ts
import { describe, expect, it } from "vitest";
import { AppError } from "../AppError";
import { ErrorCodes } from "../codes";

describe("AppError", () => {
  it("기본 생성 — message는 messages.ko에서 조회", () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE);
    expect(err.message).toBe("이미 존재하는 학생 이름입니다.");
    expect(err.code).toBe("STUDENT_NAME_DUPLICATE");
    expect(err.statusHint).toBe(500); // 기본값
    expect(err.cause).toBeUndefined();
  });

  it("statusHint 지정", () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE, { statusHint: 409 });
    expect(err.statusHint).toBe(409);
  });

  it("cause 보존", () => {
    const original = new Error("Supabase connection error");
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, { cause: original, statusHint: 500 });
    expect(err.cause).toBe(original);
  });

  it("messageOverride 사용 시 messages.ko 조회 대신 override 사용", () => {
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, {
      messageOverride: "Custom override message",
    });
    expect(err.message).toBe("Custom override message");
  });

  it("instanceof AppError 확인", () => {
    const err = new AppError(ErrorCodes.INVITE_TOKEN_EXPIRED, { statusHint: 410 });
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("name이 AppError여야 한다", () => {
    const err = new AppError(ErrorCodes.VALIDATION_FAILED);
    expect(err.name).toBe("AppError");
  });

  it("미매핑 코드 string — fallback 메시지 사용", () => {
    const err = new AppError("FUTURE_UNKNOWN_CODE");
    expect(err.message).toBe("알 수 없는 오류가 발생했습니다.");
    expect(err.code).toBe("FUTURE_UNKNOWN_CODE");
  });
});
```

- [ ] **Step 3-3: 테스트 실행**

```bash
npx vitest run src/lib/errors/__tests__/AppError.test.ts
```

Expected: 7 tests passed

- [ ] **Step 3-4: 커밋**

```bash
git add src/lib/errors/AppError.ts src/lib/errors/__tests__/AppError.test.ts
git commit -m "feat(errors): add AppError class with code + statusHint + ko message lookup"
```

---

### Task 4: `httpErrors.ts` — `toErrorResponse` 직렬화 헬퍼

**Files:**
- Create: `src/lib/errors/httpErrors.ts`
- Create: `src/lib/errors/__tests__/httpErrors.test.ts`

`AppError`이면 code/message/statusHint 사용. 아니면 `INTERNAL_ERROR` 500. `details`는 `NODE_ENV === 'development'`일 때만 포함.

- [ ] **Step 4-1: `httpErrors.ts` 작성**

```typescript
// src/lib/errors/httpErrors.ts
import { NextResponse } from "next/server";
import { AppError } from "./AppError";
import { ErrorCodes } from "./codes";
import { getKoMessage } from "./messages.ko";
import { logger } from "../logger";

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 에러를 통일된 NextResponse로 직렬화한다.
 * - AppError: code, statusHint, message 사용
 * - 그 외: INTERNAL_ERROR 500 반환 (원본 에러는 로그에만 기록)
 * - details: NODE_ENV === 'development'에서만 포함
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    const body: ErrorBody = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (process.env.NODE_ENV === "development" && error.cause != null) {
      body.error.details = {
        cause:
          error.cause instanceof Error
            ? { name: error.cause.name, message: error.cause.message }
            : String(error.cause),
      };
    }

    return NextResponse.json(body, { status: error.statusHint });
  }

  // 알 수 없는 에러 — 원본을 클라이언트에 노출하지 않음
  logger.error("Unexpected error in API route", undefined, error as Error);

  const body: ErrorBody = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: getKoMessage(ErrorCodes.INTERNAL_ERROR),
    },
  };

  if (process.env.NODE_ENV === "development") {
    body.error.details = {
      cause:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    };
  }

  return NextResponse.json(body, { status: 500 });
}
```

- [ ] **Step 4-2: `httpErrors.test.ts` 작성**

```typescript
// src/lib/errors/__tests__/httpErrors.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { toErrorResponse } from "../httpErrors";
import { AppError } from "../AppError";
import { ErrorCodes } from "../codes";

vi.mock("../../logger", () => ({
  logger: { error: vi.fn() },
}));

// NextResponse.json은 실제 Next.js 환경 없이도 동작
// vitest 환경에서 next/server가 정상 import 된다고 가정

describe("toErrorResponse", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("AppError — 올바른 code, message, statusHint로 응답", async () => {
    const err = new AppError(ErrorCodes.STUDENT_NAME_DUPLICATE, { statusHint: 409 });
    const res = toErrorResponse(err);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("STUDENT_NAME_DUPLICATE");
    expect(body.error.message).toBe("이미 존재하는 학생 이름입니다.");
    expect(body.error.details).toBeUndefined(); // production 환경
  });

  it("AppError — NODE_ENV=development에서 cause를 details에 포함", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

    const cause = new Error("DB connection failed");
    const err = new AppError(ErrorCodes.INTERNAL_ERROR, { statusHint: 500, cause });
    const res = toErrorResponse(err);

    const body = await res.json();
    expect(body.error.details).toBeDefined();
    expect(body.error.details.cause.message).toBe("DB connection failed");
  });

  it("generic Error — INTERNAL_ERROR 500 반환", async () => {
    const err = new Error("Unexpected failure");
    const res = toErrorResponse(err);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("서버 오류가 발생했습니다.");
  });

  it("generic Error — production에서 details 미포함", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

    const err = new Error("secret internal error");
    const res = toErrorResponse(err);

    const body = await res.json();
    expect(body.error.details).toBeUndefined();
  });

  it("non-Error 값 (string) — INTERNAL_ERROR 500 반환", async () => {
    const res = toErrorResponse("something went wrong");

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
```

- [ ] **Step 4-3: 테스트 실행**

```bash
npx vitest run src/lib/errors/__tests__/httpErrors.test.ts
```

Expected: 5 tests passed

- [ ] **Step 4-4: 커밋**

```bash
git add src/lib/errors/httpErrors.ts src/lib/errors/__tests__/httpErrors.test.ts
git commit -m "feat(errors): add toErrorResponse helper (AppError→NextResponse serializer)"
```

---

### Task 5: `index.ts` — barrel export + 전체 테스트 실행

**Files:**
- Create: `src/lib/errors/index.ts`

- [ ] **Step 5-1: `index.ts` 작성**

```typescript
// src/lib/errors/index.ts
export { AppError } from "./AppError";
export { ErrorCodes, type ErrorCode } from "./codes";
export { getKoMessage } from "./messages.ko";
export { toErrorResponse } from "./httpErrors";
```

- [ ] **Step 5-2: 전체 errors 테스트 실행**

```bash
npx vitest run src/lib/errors/
```

Expected: 4 test files, all passed

- [ ] **Step 5-3: typecheck + build 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run check:quick
```

Expected: type-check PASS, unit tests PASS

- [ ] **Step 5-4: 커밋 + PR 생성**

```bash
git add src/lib/errors/index.ts
git commit -m "feat(errors): add barrel export for src/lib/errors"

git push origin feat/error-handling-step2-errors
```

PR 생성:
```bash
gh pr create \
  --base dev \
  --head feat/error-handling-step2-errors \
  --title "feat(errors): add AppError + error codes + messages.ko + toErrorResponse (F3 Step 2)" \
  --body "$(cat <<'EOF'
## Summary

- `src/lib/errors/codes.ts` — 에러 코드 상수 (`{ENTITY}_{FIELD}_{RULE}` SNAKE_CASE, `ErrorCode` union type)
- `src/lib/errors/messages.ko.ts` — `Record<ErrorCode, string>` 한국어 매핑 + `getKoMessage()` fallback
- `src/lib/errors/AppError.ts` — `code + statusHint + cause` 보유 커스텀 에러 클래스 (message는 messages.ko 자동 조회)
- `src/lib/errors/httpErrors.ts` — `toErrorResponse(error): NextResponse` 통일 직렬화 (details dev-only)
- 기존 코드 변경 없음 — purely additive

## Test plan
- [ ] `npx vitest run src/lib/errors/` — 4 test files all pass
- [ ] `npm run check:quick` — type-check + unit PASS
- [ ] CI green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

### Spec coverage check

| Spec 요구사항 | Task |
|---|---|
| `AppError.ts` — code, statusHint, cause | Task 3 |
| `codes.ts` — SNAKE_CASE `{ENTITY}_{FIELD}_{RULE}` | Task 1 |
| `messages.ko.ts` — `Record<ErrorCode, string>` + fallback | Task 2 |
| `httpErrors.ts` — `toErrorResponse`, details dev-only | Task 4 |
| `index.ts` — barrel export | Task 5 |
| 기존 코드 변경 없음 | 전 Task에서 신규 파일만 생성 |
| D5: `{ success, error: { code, message } }` 포맷 | Task 4 |
| D6: `{ENTITY}_{FIELD}_{RULE}` 네이밍 | Task 1 |
| messages.ko fallback: `"알 수 없는 오류가 발생했습니다."` | Task 2 |

### Placeholder scan

없음 — 모든 스텝에 실제 코드와 실행 명령 포함.

### Type consistency check

- `ErrorCode` → Task 1 정의, Task 2/3/4에서 import — 일관성 확인됨
- `AppError` → Task 3 정의, Task 4에서 import — 일관성 확인됨
- `getKoMessage(code: string): string` → Task 2 정의, Task 3/4에서 사용 — 일관성 확인됨
- `toErrorResponse(error: unknown): NextResponse<ErrorBody>` — Task 4 정의

### Scope check

신규 파일 5개 + 테스트 4개. 기존 파일 0개 수정. 한 PR 범위로 적절.
