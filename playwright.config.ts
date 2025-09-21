import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000", // 실제 개발 서버 포트
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure", // 실패 시 비디오 녹화
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
    command: "npm run dev",
    url: "http://localhost:3000", // 실제 개발 서버 포트
    reuseExistingServer: true, // 항상 기존 서버 재사용
    timeout: 30 * 1000, // 30초 타임아웃으로 단축
  },
});
