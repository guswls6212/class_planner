# Production-grade 테스트 가이드 (Stage D)

> Phase 1 production release 전 production build 동작을 로컬에서 검증하는 인프라.
> Stage D (`/design-explorations/phase1-release-readiness`) 의 산출물.

## 왜 production-grade 테스트인가

`npm run dev` 는 development mode — Turbopack HMR + 비 minification + Service
Worker 비활성. production deploy 후 발생하는 사고 (SW 캐시 오작동, env 미적용,
code splitting chunk 누락, route segment lazy load 실패) 는 dev 에서 안 보임.

`npm run test:release` 가 production build 를 로컬에서 실행 + Playwright 가 5
critical path 자동 검증 — 친구 선공개 전 마지막 가드.

## 사용법

### 1. 첫 셋업 (1회)

```bash
cd class-planner
npm install                    # start-server-and-test devDependency 추가 반영
npx playwright install chromium  # 이미 있으면 skip
```

### 2. 일반 실행

```bash
npm run test:release
```

내부 동작:

1. `next build` — production 번들 생성 (`.next/` 디렉토리)
2. `start-server-and-test` 가 `next start -p 3100` background 실행
3. `http://localhost:3100` 가 ready 될 때까지 wait-on
4. `playwright test --grep @prod-smoke --project=chromium` 실행
5. 결과와 무관하게 production server 자동 종료 (zombie process 없음)

### 3. 분리 실행 (디버깅 시)

```bash
# 터미널 1 — production server
npm run build
npm run start:prod-test       # localhost:3100 으로 시작

# 터미널 2 — smoke test 만
npm run test:e2e:prod-smoke

# 또는 단일 test
PROD_BASE_URL=http://localhost:3100 \
  npx playwright test --grep "1. Health" --project=chromium --headed
```

### 4. BASE_URL override (staging 환경 검증)

```bash
PROD_BASE_URL=https://class-planner-staging.info365.studio \
  npm run test:e2e:prod-smoke
```

## 5 Critical Paths

`tests/e2e/prod-smoke.spec.ts` 의 `@prod-smoke` 태그 5 시나리오. 모두
read-only — production server 의 데이터 변경 없음.

| # | 시나리오 | 검증 대상 |
|---|---------|-----------|
| 1 | Health — root 200 + title | production server 가 시작됨, route resolve 동작 |
| 2 | Anonymous /schedule loads with main shell | AppShell + Sidebar production 번들 정상 hydrate |
| 3 | /about page renders | SEO landing surface 200 |
| 4 | /login Google OAuth button enabled | Supabase Auth + env.production 적용 |
| 5 | Service Worker registered | serwist SW production-only 활성 (dev 에선 fail = 정상) |

## 확장 시 가이드

신규 critical path 추가:

```ts
test("6. PDF download blob (anonymous, read-only)", async ({ page }) => {
  await page.goto(PROD_BASE_URL + "/schedule");
  // ... 익명 시간표 시드 + PDF 버튼 클릭 + blob URL 검증
});
```

**원칙**:
- `@prod-smoke` 태그 필수 — `test:e2e:prod-smoke` 가 `--grep` 으로 선별
- read-only — production server 의 academy/user 데이터 변경 금지
- 5초 이내 1 test — smoke 의 정의 (전체 5 test 합쳐 1분 이내 목표)
- 가이드 (`docs/test-authoring-guide.md`) 의 flaky 8 원칙 준수 — `waitForTimeout`
  금지, `getByRole`/`data-testid` 사용, `expect.poll` for 비동기 wait

## 추가 production 검증 (수동)

`test:release` 가 자동화하지 않는 항목 — Stage C UAT Phase 1 mode 에서 수동:

- **Service Worker offline fallback** — production server stop 후 offline page
  표시 확인 (`/~offline` route)
- **Code splitting chunk size** — `npm run build` output 의 route 별 first-load
  JS 값을 200KB 미만 유지 (`@next/bundle-analyzer` 도입 검토)
- **env validation** — `.env.production` 의 `NEXT_PUBLIC_SUPABASE_URL` 누락 시
  build fail 동작 (`src/utils/supabaseClient.ts` 의 ENV guard)
- **RLS 정책** — `SUPABASE_SERVICE_ROLE_KEY` 가 client bundle 에 노출 안 됨
  확인: `rg "SUPABASE_SERVICE_ROLE_KEY" .next/static/ -l` 결과 0건
- **robots.txt + sitemap.xml** — production 에서 enabled (현재 미구현, Stage E
  Top 10 rank 7 로 분류)

## CI 통합 (옵션, Stage E 이후)

`.github/workflows/ci.yml` 에 `prod-smoke` job 추가:

```yaml
prod-smoke:
  runs-on: ubuntu-latest
  needs: [check, build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - run: npm run test:release
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
```

main 머지 전 production build 자동 검증 — Stage E dev → main PR CI gate.

## 트러블슈팅

### "port 3100 already in use"

```bash
lsof -ti:3100 | xargs kill
npm run test:release
```

### "start-server-and-test: command not found"

```bash
npm install
# devDependency 가 반영되지 않았으면
npm install --save-dev start-server-and-test
```

### Test 5 SW Registered fail in dev

정상. Service Worker 는 production build 에서만 활성 (`@serwist/next` 설정).
`npm run dev` 로 띄운 server 에 대해서는 본 테스트 fail = 의도된 동작.

### Playwright timeout 60s 초과

production server start 시간이 느릴 때. `playwright.config.ts` 의 `timeout:
60000` 또는 본 spec 의 `toBeVisible({timeout: 10000})` 값 조정.

## 관련 문서

- `tests/e2e/prod-smoke.spec.ts` — 본 spec 파일
- `docs/test-authoring-guide.md` — flaky 8 원칙 SSOT
- `docs/adr/007-sw-timing-fix.md` — Service Worker timing (NetworkOnly + AuthGuard 7s)
- `src/app/design-explorations/phase1-release-readiness/page.tsx` — Stage A-E roadmap SSOT
- `tests/manual/uat-checklist.md` — UAT Phase 1 Production Readiness Mode (Stage C)
