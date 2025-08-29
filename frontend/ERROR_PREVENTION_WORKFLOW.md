# 🚨 에러 방지를 위한 체계적 접근법

## 📋 목적

이 문서는 클래스 플래너 프로젝트에서 발생할 수 있는 에러를 사전에 방지하고, 개발 과정에서 체계적으로 검증할 수 있는 워크플로우를 제공합니다.

---

## 🎯 **1. 개발 단계별 검증 프로세스**

### **Phase 1: 코드 작성 단계**

```bash
✅ 코드 작성 완료
✅ TypeScript 타입 체크 통과
✅ ESLint 규칙 준수
✅ Prettier 포맷팅 적용
```

### **Phase 2: 단위 테스트 단계**

```bash
✅ 관련 컴포넌트 단위 테스트 통과
✅ 유틸리티 함수 테스트 통과
✅ 타입 정의 테스트 통과
```

### **Phase 3: 통합 테스트 단계**

```bash
✅ 컴포넌트 간 상호작용 테스트 통과
✅ 페이지 레벨 통합 테스트 통과
✅ 사용자 시나리오 테스트 통과
```

### **Phase 4: 브라우저 환경 테스트 단계**

```bash
✅ 개발 서버 실행 성공
✅ 브라우저에서 페이지 로딩 성공
✅ 콘솔 에러 없음
✅ 주요 기능 동작 확인
```

### **Phase 5: 커밋 전 최종 검증 단계**

```bash
✅ 전체 테스트 스위트 통과
✅ prepare-commit 실행 성공
✅ 브라우저에서 최종 동작 확인
✅ 커밋 및 푸시
```

---

## 🔍 **2. 모듈 Import 검증 체크리스트**

### **A. 타입 Import 검증**

```typescript
// ✅ 올바른 방법
import type { Session, Subject } from '../../lib/planner';

// ❌ 잘못된 방법 (런타임 에러 가능성)
import { Session, Subject } from '../../lib/planner';
```

**검증 포인트:**

- [ ] 타입만 사용하는 경우 `import type` 사용
- [ ] 런타임 값이 필요한 경우 `import` 사용
- [ ] 순환 참조 확인
- [ ] 상대 경로 vs 절대 경로 일관성

### **B. 모듈 Export 검증**

```typescript
// ✅ 올바른 방법
export type Session = { ... };
export interface Subject { ... };
export function createSession() { ... };

// ❌ 잘못된 방법
export { Session }; // 다른 파일에서 re-export
```

**검증 포인트:**

- [ ] 타입과 함수가 명확히 구분되어 export됨
- [ ] default export vs named export 일관성
- [ ] barrel export (index.ts) 사용 시 주의

### **C. 경로 해석 검증**

```typescript
// ✅ 상대 경로 (권장)
import { Session } from '../../lib/planner';

// ⚠️ 절대 경로 (tsconfig 설정 필요)
import { Session } from '@/lib/planner';

// ❌ 잘못된 경로
import { Session } from 'planner';
```

---

## 🧪 **3. 테스트 환경별 검증 전략**

### **A. 단위 테스트 (Vitest)**

```bash
# 개별 컴포넌트 테스트
npm test -- --run src/components/molecules/__tests__/SessionBlock.test.tsx

# 특정 함수 테스트
npm test -- --run src/lib/__tests__/planner.test.ts
```

**검증 범위:**

- [ ] 컴포넌트 렌더링
- [ ] 함수 로직
- [ ] 타입 정의
- [ ] 에러 처리

### **B. 통합 테스트 (React Testing Library)**

```bash
# 페이지 레벨 통합 테스트
npm test -- --run src/pages/__tests__/Schedule.integration.test.tsx

# 전체 통합 테스트
npm test -- --run
```

**검증 범위:**

- [ ] 컴포넌트 간 상호작용
- [ ] 사용자 시나리오
- [ ] 상태 관리
- [ ] 이벤트 처리

### **C. 브라우저 환경 테스트**

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# 1. 페이지 로딩 성공
# 2. 콘솔 에러 없음
# 3. 주요 기능 동작
```

**검증 범위:**

- [ ] 모듈 번들링 성공
- [ ] 런타임 에러 없음
- [ ] UI 렌더링 정상
- [ ] 사용자 인터랙션 정상

---

## 🚨 **4. 에러 유형별 대응 전략**

### **A. TypeScript 컴파일 에러**

```bash
# 에러 유형: 타입 불일치, 인터페이스 누락
# 해결 방법: 타입 정의 수정, 인터페이스 추가
npm run type-check
```

**체크리스트:**

- [ ] 타입 정의가 올바른지 확인
- [ ] 인터페이스가 필요한 모든 속성을 포함하는지 확인
- [ ] 제네릭 타입 사용이 올바른지 확인

### **B. ESLint 규칙 위반**

```bash
# 에러 유형: 코드 스타일, React 규칙 위반
# 해결 방법: 코드 수정, 규칙 예외 처리
npm run lint
```

**체크리스트:**

- [ ] react-refresh/only-export-components 규칙 준수
- [ ] react-hooks/exhaustive-deps 규칙 준수
- [ ] unused variables 제거

### **C. 모듈 해석 에러**

```bash
# 에러 유형: 모듈을 찾을 수 없음, export를 찾을 수 없음
# 해결 방법: import/export 구문 수정, 경로 확인
```

**체크리스트:**

- [ ] 파일 경로가 올바른지 확인
- [ ] export 구문이 올바른지 확인
- [ ] 순환 참조가 없는지 확인

### **D. 런타임 에러**

```bash
# 에러 유형: 브라우저 콘솔 에러, 기능 동작 안됨
# 해결 방법: 브라우저 디버깅, 코드 로직 수정
```

**체크리스트:**

- [ ] 브라우저 콘솔 에러 확인
- [ ] 네트워크 탭에서 모듈 로딩 실패 확인
- [ ] 브레이크포인트로 디버깅

---

## 🔧 **5. 자동화된 검증 도구**

### **A. Pre-commit Hook 설정**

```json
// package.json
{
  "scripts": {
    "prepare-commit": "npm run lint && npm run format && npm test"
  }
}
```

**실행 순서:**

1. ESLint 검사
2. Prettier 포맷팅
3. 전체 테스트 실행

### **B. CI/CD 파이프라인**

```yaml
# .github/workflows/test.yml
name: Test and Lint
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

### **C. IDE 설정**

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.validate": ["typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  }
}
```

---

## 📝 **6. 에러 발생 시 대응 절차**

### **Step 1: 에러 분석**

```bash
# 1. 에러 메시지 정확히 파악
# 2. 에러 발생 위치 확인
# 3. 에러 유형 분류 (컴파일/런타임/테스트)
```

### **Step 2: 원인 파악**

```bash
# 1. 코드 변경 이력 확인
# 2. 관련 파일들 검토
# 3. 의존성 관계 분석
```

### **Step 3: 해결 방법 선택**

```bash
# 1. 즉시 수정 가능한 경우: 코드 수정
# 2. 복잡한 경우: 단계별 접근
# 3. 의존성 문제: 아키텍처 검토
```

### **Step 4: 검증 및 테스트**

```bash
# 1. 수정 후 단위 테스트 실행
# 2. 통합 테스트 실행
# 3. 브라우저에서 동작 확인
```

### **Step 5: 문서화 및 학습**

```bash
# 1. 에러 원인과 해결 방법 기록
# 2. 유사한 에러 방지 방안 추가
# 3. 팀원들과 공유
```

---

## 🎯 **7. 일일 개발 체크리스트**

### **개발 시작 시**

- [ ] 최신 코드 pull
- [ ] 의존성 설치 확인 (`npm install`)
- [ ] 개발 서버 실행 테스트

### **코드 작성 중**

- [ ] TypeScript 에러 즉시 수정
- [ ] ESLint 경고 즉시 수정
- [ ] 작은 단위로 테스트 실행

### **기능 완성 시**

- [ ] 관련 단위 테스트 작성/수정
- [ ] 통합 테스트 실행
- [ ] 브라우저에서 동작 확인

### **커밋 전**

- [ ] 전체 테스트 스위트 실행
- [ ] prepare-commit 실행
- [ ] 최종 브라우저 확인

---

## 🚀 **8. 에러 방지 성공 지표**

### **정량적 지표**

- [ ] 테스트 커버리지 90% 이상 유지
- [ ] ESLint 에러 0개 유지
- [ ] TypeScript 컴파일 에러 0개 유지
- [ ] 런타임 에러 발생률 5% 이하

### **정성적 지표**

- [ ] 개발자 경험 향상
- [ ] 코드 품질 개선
- [ ] 버그 발생률 감소
- [ ] 배포 안정성 향상

---

## 📚 **9. 참고 자료**

### **공식 문서**

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vite Configuration](https://vitejs.dev/config/)

### **모범 사례**

- [React Best Practices](https://react.dev/learn)
- [TypeScript Best Practices](https://github.com/typescript-eslint/typescript-eslint)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

_이 문서는 지속적으로 업데이트되어야 하며, 팀원 모두가 공유하여 사용해야 합니다._
