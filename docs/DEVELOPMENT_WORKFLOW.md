# 개발 워크플로우 가이드

## 📋 개요

클래스 플래너 프로젝트의 개발 프로세스, 에러 방지 방법, 그리고 코드 품질 관리 방법을 설명합니다.

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

## 🛡️ 에러 방지 가이드

### 핵심 원칙

1. **전체 파일 읽기 우선**
2. **단계별 접근**
3. **즉시 테스트 실행**
4. **문제 발견 시 즉시 수정**
5. **백업 생성 후 작업**
6. **수정 전후 상태 검증**
7. **사용자 요청 범위 준수**
8. **인라인 스타일 사용 금지**
9. **TailwindCSS 우선 사용**

### 반복 작업 방지 체크리스트

#### 수정 전

- [ ] 전체 파일 읽기 완료
- [ ] 현재 상태 정확히 파악
- [ ] 변경 계획 수립
- [ ] 백업 생성 (`git stash`)
- [ ] 사용자 요청 범위 확인
- [ ] 인라인 스타일 사용 여부 확인
- [ ] TailwindCSS 클래스로 변환 가능한지 검토

#### 수정 중

- [ ] 정확한 위치 식별
- [ ] 한 번에 하나의 작은 변경
- [ ] 각 변경 후 즉시 검증
- [ ] 의존성 관계 확인
- [ ] 요청받은 작업만 수행
- [ ] 인라인 스타일을 TailwindCSS 클래스로 변환
- [ ] 커스텀 값은 tailwind.config.ts에 등록

#### 수정 후

- [ ] 변경사항 의도대로 적용 확인
- [ ] 연관 파일 영향도 확인
- [ ] 전체 테스트 스위트 실행
- [ ] 브라우저에서 동작 확인
- [ ] 사용자에게 결과 보고
- [ ] 인라인 스타일이 모두 제거되었는지 확인
- [ ] TailwindCSS 클래스가 올바르게 적용되었는지 확인

## 🎨 TailwindCSS 스타일링 가이드

### 핵심 원칙

#### **1. 인라인 스타일 사용 금지**

- ❌ **인라인 스타일 사용 금지**: `style={{...}}` 사용을 피해야 합니다
- ✅ **TailwindCSS 클래스 사용**: 모든 스타일은 `className`에서 TailwindCSS 유틸리티 클래스로 관리
- ✅ **CSS 변수 활용**: 커스텀 값들은 `tailwind.config.ts`에 등록하여 의미 있는 클래스명으로 사용

#### **2. 올바른 TailwindCSS 사용법**

**수정 전 (인라인 스타일)**

```jsx
<div
  className="relative custom-scrollbar"
  style={{
    listStyle: "none",
    margin: 0,
    padding: 0,
    maxHeight: "400px",
    overflow: "auto",
    background: "var(--color-bg-primary)",
    borderRadius: "var(--border-radius-md)",
    border: "1px solid var(--color-border)",
  }}
/>
```

**수정 후 (TailwindCSS 클래스)**

```jsx
<div className="relative custom-scrollbar list-none m-0 p-0 max-h-[400px] overflow-auto bg-bg-primary rounded-md border border-border" />
```

### 커스텀 값 설정 방법

#### **tailwind.config.ts 설정**

```typescript
theme: {
  extend: {
    colors: {
      bg: {
        primary: "var(--color-bg-primary)",
        secondary: "var(--color-bg-secondary)",
      },
      text: {
        primary: "var(--color-text-primary)",
        muted: "var(--color-text-muted)",
      },
      border: {
        DEFAULT: "var(--color-border)",
        light: "var(--color-border-light)",
      },
    },
    spacing: {
      xs: "4px",
      sm: "8px",
      md: "16px",
      lg: "24px",
    },
    borderRadius: {
      sm: "4px",
      md: "6px",
      lg: "8px",
    },
  },
}
```

## 🔧 명령어 영향 범위

### 빌드 관련 명령어

| 명령어             | 영향 범위     | 주의사항                       |
| ------------------ | ------------- | ------------------------------ |
| `npm run build`    | 전체 프로젝트 | Next.js 빌드 (SSR + 정적 생성) |
| `npm run dev`      | 개발 환경     | Next.js 개발 서버 (핫 리로드)  |
| `npm run start`    | 프로덕션      | 빌드된 앱 실행                 |
| `npm run lint`     | 코드 품질     | ESLint 검사                    |
| `npm run lint:fix` | 코드 품질     | ESLint 자동 수정               |

### 테스트 관련 명령어

| 명령어                  | 영향 범위   | 주의사항             |
| ----------------------- | ----------- | -------------------- |
| `npm run test`          | 전체 테스트 | Vitest 실행          |
| `npm run test:watch`    | 개발 테스트 | Watch 모드로 테스트  |
| `npm run test:coverage` | 커버리지    | 테스트 커버리지 측정 |
| `npm run test:e2e`      | E2E 테스트  | Playwright 실행      |
| `npm run test:ui`       | 테스트 UI   | Vitest UI 실행       |

### 코드 품질 관련 명령어

| 명령어                   | 영향 범위    | 주의사항           |
| ------------------------ | ------------ | ------------------ |
| `npm run lint`           | 코드 스타일  | ESLint 규칙 검사   |
| `npm run lint:fix`       | 코드 스타일  | 자동 수정          |
| `npm run format`         | 코드 포맷    | Prettier 적용      |
| `npm run prepare-commit` | 커밋 전 검증 | 전체 검증 프로세스 |

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

## 📚 관련 문서

- [프로젝트 구조 가이드](./PROJECT_STRUCTURE.md)
- [컴포넌트 가이드](./COMPONENT_GUIDE.md)
- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
- [로깅 가이드](./LOGGING_GUIDE.md)
- [보안 가이드](./SECURITY_GUIDE.md)
- [문서 가이드](./README.md)

---

_이 문서는 개발 프로세스와 코드 품질 관리 방법을 설명합니다. 프로젝트 구조에 대한 자세한 내용은 [프로젝트 구조 가이드](./PROJECT_STRUCTURE.md)를 참조하세요._
