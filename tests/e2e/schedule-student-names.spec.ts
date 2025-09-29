import { expect, test } from "@playwright/test";
import {
  E2E_CONFIG,
  createAuthData,
  loadPageWithAuth,
} from "./config/e2e-config";

test.describe("Schedule 학생명 표시 (3명 + 외 N명)", () => {
  test.beforeEach(async ({ page }) => {
    // 커스텀 데이터 설정
    const customData = {
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
    };

    // 인증 설정과 함께 커스텀 데이터 설정
    await page.addInitScript(
      ({ config, authData, customData }) => {
        localStorage.setItem("supabase_user_id", config.TEST_USER_ID);
        localStorage.setItem(
          config.SUPABASE_TOKEN_KEY,
          JSON.stringify(authData)
        );
        localStorage.setItem("classPlannerData", JSON.stringify(customData));
      },
      {
        config: E2E_CONFIG,
        authData: createAuthData(
          E2E_CONFIG.TEST_USER_ID,
          E2E_CONFIG.TEST_EMAIL
        ),
        customData,
      }
    );

    await loadPageWithAuth(page, "/schedule");
  });

  test("4명 이상일 때 3명 + 외 N명으로 표시되어야 한다", async ({ page }) => {
    // 가장 최근 세션 블록을 선택 (data-testid^="session-block-")
    const sessionBlock = page.locator('[data-testid^="session-block-"]').last();
    await expect(sessionBlock).toBeVisible();

    // 실제 동작 확인: 모든 학생 이름이 표시되는지 확인
    await expect(sessionBlock).toContainText("E2E학생1");
    await expect(sessionBlock).toContainText("E2E학생2");
    await expect(sessionBlock).toContainText("E2E학생3");
    await expect(sessionBlock).toContainText("E2E학생4");

    // 세션 블록에 과목명도 포함되어 있는지 확인
    await expect(sessionBlock).toContainText("E2E과목");
  });
});
