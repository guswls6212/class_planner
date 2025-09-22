import { expect, test } from "@playwright/test";

const E2E_CONFIG = {
  BASE_URL: "http://localhost:3000",
  SUPABASE_TOKEN_KEY: "sb-kcyqftasdxtqslrhbctv-auth-token",
  TEST_USER_ID: "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391",
  TEST_EMAIL: "info365001.e2e.test@gmail.com",
} as const;

function createAuthData(userId: string, email: string) {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: userId, email, role: "authenticated" },
  };
}

function createDefaultData() {
  return {
    students: [],
    subjects: [{ id: "sub-1", name: "E2E과목", color: "#3b82f6" }],
    sessions: [],
    enrollments: [],
  };
}

test.describe("Schedule 학생명 표시 (3명 + 외 N명)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ config, authData, defaultData }) => {
        localStorage.setItem("supabase_user_id", config.TEST_USER_ID);
        localStorage.setItem(
          config.SUPABASE_TOKEN_KEY,
          JSON.stringify(authData)
        );
        localStorage.setItem("classPlannerData", JSON.stringify(defaultData));
      },
      {
        config: E2E_CONFIG,
        authData: createAuthData(
          E2E_CONFIG.TEST_USER_ID,
          E2E_CONFIG.TEST_EMAIL
        ),
        defaultData: {
          students: [
            { id: "s-1", name: "E2E학생1" },
            { id: "s-2", name: "E2E학생2" },
            { id: "s-3", name: "E2E학생3" },
            { id: "s-4", name: "E2E학생4" },
          ],
          subjects: [{ id: "sub-1", name: "E2E과목", color: "#3b82f6" }],
          enrollments: [
            { id: "e-1", studentId: "s-1", subjectId: "sub-1" },
            { id: "e-2", studentId: "s-2", subjectId: "sub-1" },
            { id: "e-3", studentId: "s-3", subjectId: "sub-1" },
            { id: "e-4", studentId: "s-4", subjectId: "sub-1" },
          ],
          sessions: [
            {
              id: "sess-1",
              enrollmentIds: ["e-1", "e-2", "e-3", "e-4"],
              weekday: 0,
              startsAt: "09:00",
              endsAt: "10:00",
              room: "A101",
            },
          ],
        },
      }
    );
    await page.goto(`${E2E_CONFIG.BASE_URL}/schedule`);
  });

  test("4명 이상일 때 3명 + 외 N명으로 표시되어야 한다", async ({ page }) => {
    // 가장 최근 세션 블록을 선택 (data-testid^="session-block-")
    const sessionBlock = page.locator('[data-testid^="session-block-"]').last();
    await expect(sessionBlock).toBeVisible();

    await expect(sessionBlock).toContainText("E2E학생1");
    await expect(sessionBlock).toContainText("E2E학생2");
    await expect(sessionBlock).toContainText("E2E학생3");
    await expect(sessionBlock).toContainText("외 1명");
  });
});
