# 테스트 실행 명령어 가이드

## 📋 개요

3-Layer 검증 구조를 따른다.

```
Layer 1 (로컬)  : npm run check         — tsc + unit + build
Layer 2 (CI)    : GitHub Actions ci.yml — Layer 1 + Playwright Chromium
Layer 3 (세션)  : Claude Stop 훅 + Playwright MCP
```

---

## Layer 1 — 로컬 검증

### `npm run check:quick` — 작업 중 빠른 피드백 (수십 초)
```bash
npm run check:quick
# = tsc + vitest run
```

### `npm run check` — 커밋/푸시 전 1회 (1분 내외)
```bash
npm run check
# = tsc + vitest run + next build
```

---

## Layer 2 — CI (GitHub Actions)

PR 또는 main push 시 자동 실행. 수동 확인 불필요.

- **check job**: `type-check` → `lint` → `test`
- **build job**: `next build` (NEXT_PUBLIC_* secrets 필요)
- **e2e job**: Playwright Chromium `final-working-test.spec.ts`

GitHub Secrets 필요: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 개별 테스트 명령어

### 단위 테스트
```bash
npm run test                            # 전체
npm run test -- src/domain/             # 특정 경로
npm run test:watch                      # 감시 모드
npm run test:coverage                   # 커버리지 포함
```

### E2E 테스트 (로컬)
```bash
npm run test:e2e                        # 헤드리스
npm run test:e2e:ui                     # Playwright UI
npm run test:e2e:headed                 # 헤드 모드
npm run test:e2e:real-scenarios         # 실제 시나리오
```

### 통합 / 시스템 테스트
```bash
npm run test:integration:real-supabase  # 실제 Supabase 연결
npm run test:real-client                # 통합 + 시나리오
npm run test:system                     # 시스템 레벨
npm run test:system:headless
```

### 기타
```bash
npm run type-check                      # tsc 만
npm run lint                            # lint 만
npm run lint:fix                        # lint 자동 수정
npm run build                           # 빌드만
```

---

## 🚨 문제 해결

### TypeScript 에러
```bash
npm run type-check
npx tsc --noEmit src/specific-file.ts
```

### E2E 테스트 실패
```bash
npm run test:e2e:ui        # UI 모드로 디버그
npm run test:e2e:headed    # 브라우저 띄워서 확인
```

### Supabase 연결 실패
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run test:integration:real-supabase
```

### 빌드 실패
```bash
rm -rf .next && npm run build
```

---

## 📚 관련 문서

- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
