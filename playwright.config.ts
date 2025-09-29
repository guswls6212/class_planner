import { defineConfig, devices } from "@playwright/test";
import { E2E_CONFIG } from "./tests/e2e/config/e2e-config";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // 병렬 실행 비활성화로 안정성 향상
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 단일 워커로 안정성 최대화
  timeout: 60000, // E2E 테스트 타임아웃을 1분으로 더 단축
  reporter: [["html", { open: "never" }], ["list"]],
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
    command: "npm run dev", // 개발 서버 시작
    url: E2E_CONFIG.BASE_URL, // 공용 E2E 설정 사용
    reuseExistingServer: false, // 항상 새 서버 시작 (E2E 전용)
    timeout: E2E_CONFIG.TIMEOUTS.PAGE_LOAD * 6, // 공용 타임아웃 사용 (6배로 설정)
  },
});
