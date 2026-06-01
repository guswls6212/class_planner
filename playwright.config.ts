import { defineConfig, devices } from "@playwright/test";
import { E2E_CONFIG } from "./tests/e2e/config/e2e-config";

export default defineConfig({
  testDir: "./tests/e2e",
  // 친구-비가시(features.ts 숨김) 기능 e2e 제외 — 친구 경로에 없어 회귀 가드 가치 낮고
  // CI 부담만 큼(2026-06-01 보수안). /schedule 엔진(conflict/drag/sync/scroll/viewmode) spec 은
  // dev 모드(seed 의 cp:show-hidden)로 유지해 KEPT 동작 커버리지 보존. 기능 un-hide 시 해당 줄 제거로 복구.
  testIgnore: [
    "**/share-link.spec.ts",
    "**/share-mobile.spec.ts",
    "**/pdf-export.spec.ts",
    "**/multi-academy.spec.ts",
    "**/team-invite-redesign.spec.ts",
    "**/templates-apply-delete.spec.ts",
    "**/templates-multi-slot.spec.ts",
    "**/schedule-templates.spec.ts",
  ],
  fullyParallel: false, // 병렬 실행 비활성화로 안정성 향상
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 단일 워커로 안정성 최대화
  timeout: 60000, // E2E 테스트 타임아웃을 1분으로 더 단축
  reporter: [["html", { open: "never" }], ["list"]],
  // Supabase password auth로 e2e 전용 test user 로그인 → playwright/.auth/session.json 저장.
  // 각 spec이 helpers/auth-mock.ts injectRealSession()으로 inject. PR C 도입.
  // E2E_TEST_USER_EMAIL/PASSWORD env 누락 시 globalSetup이 throw — auth 의존 spec만 영향.
  // string path — Playwright가 cwd 기반으로 resolve. ESM eslint no-undef(`require`) 회피.
  globalSetup:
    process.env.E2E_TEST_USER_EMAIL && process.env.E2E_TEST_USER_PASSWORD
      ? "./tests/e2e/global-setup.ts"
      : undefined,
  // PR M — 모든 e2e 끝난 후 cleanupTestUserData 자동 호출 → 환경 누적 영구 차단.
  // SUPABASE_SERVICE_ROLE_KEY 없으면 cleanup 건너뜀(graceful).
  globalTeardown: process.env.SUPABASE_SERVICE_ROLE_KEY
    ? "./tests/e2e/global-teardown.ts"
    : undefined,
  use: {
    baseURL: E2E_CONFIG.BASE_URL, // 공용 E2E 설정 사용
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure", // 실패 시 비디오 녹화
    actionTimeout: 15000, // 개별 액션 타임아웃 15초
    navigationTimeout: 15000, // 네비게이션 타임아웃 15초
    // 브라우저 안정성 설정
    launchOptions: {
      slowMo: 100, // 액션 간 100ms 지연
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: process.env.CI
      ? "npm run build && npm run start" // CI: production build 후 서버 시작
      : "npm run dev",                    // 로컬: Turbopack dev 서버
    url: E2E_CONFIG.BASE_URL,
    reuseExistingServer: !process.env.CI, // 로컬은 기존 서버 재사용, CI 는 항상 새로 시작
    timeout: E2E_CONFIG.TIMEOUTS.PAGE_LOAD * 12, // CI build 포함 타임아웃 (2분)
  },
});
