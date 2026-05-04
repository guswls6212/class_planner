/**
 * 템플릿 저장/적용 round-trip e2e — teacherId/teacherName 직렬화 회귀 가드.
 *
 * 회귀 가드 핵심:
 * - PR #121 템플릿 재설계 + PR #137 강사 persistence 이후, buildTemplateData가
 *   teacherId를 누락하던 버그가 발견됨. (page.tsx의 useCallback 내부에 로직이
 *   묻혀 있어 단위 테스트 불가, mock fixture에 teacherId 없어 검증 갭).
 * - 본 e2e: 강사 포함 sessions가 있는 상태에서 "현재 주를 템플릿으로 저장" 클릭 →
 *   POST /api/templates body의 sessions[0].teacherId/teacherName 검증.
 * - 추가 가드: POST 500 응답 시 success 토스트 누출 방지(handleSaveTemplate이
 *   리턴값을 무시하던 silent failure 회귀 가드).
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { currentWeekMondayKST } from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const TEACHER_ID = "tc-test-1";
const TEACHER_NAME = "김선생";
const WEEK = currentWeekMondayKST();

/**
 * 인증된 사용자처럼 보이도록 supabase_user_id 만 set — supabase.auth.getSession()은
 * null로 남아 useMyRole이 anonymous-first 분기로 canManage=true 반환.
 * useTemplates(userId)는 userId만 있으면 /api/templates에 fetch 발사.
 */
async function seedTeacherAndSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ uid, week, teacherId, teacherName }) => {
      const payload = {
        students: [{ id: "stu-1", name: "학생 A" }],
        subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
        teachers: [
          { id: teacherId, name: teacherName, color: "#FF0000", userId: null },
        ],
        enrollments: [
          { id: "enr-1", studentId: "stu-1", subjectId: "sub-1" },
        ],
        sessions: [
          {
            id: "sess-1",
            subjectId: "sub-1",
            weekday: 0,
            startsAt: "09:00",
            endsAt: "10:00",
            weekStartDate: week,
            enrollmentIds: ["enr-1"],
            yPosition: 1,
            teacherId,
          },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem("supabase_user_id", uid);
      localStorage.setItem(`classPlannerData:${uid}`, JSON.stringify(payload));
    },
    { uid: TEST_USER_ID, week: WEEK, teacherId: TEACHER_ID, teacherName: TEACHER_NAME }
  );
}

interface TemplatePostBody {
  name?: string;
  description?: string | null;
  templateData?: {
    version?: string;
    sessions?: Array<{
      teacherId?: string;
      teacherName?: string;
      [k: string]: unknown;
    }>;
  };
}

test.describe("schedule templates teacher serialization", () => {
  test("템플릿 저장 시 POST body에 teacherId/teacherName이 포함된다", async ({ page }) => {
    await seedTeacherAndSession(page);

    let postBody: TemplatePostBody | null = null;
    await page.route("**/api/templates**", async (route: Route) => {
      const method = route.request().method();
      if (method === "POST") {
        postBody = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "tpl-saved",
              name: postBody?.name ?? "",
              description: postBody?.description ?? null,
              template_data: postBody?.templateData ?? { version: "1.0", sessions: [] },
              created_by: TEST_USER_ID,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          }),
        });
      } else if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/schedule");
    await page.getByRole("button", { name: /^템플릿$/ }).click();
    await page.getByRole("button", { name: /현재 주를 템플릿으로 저장/ }).click();

    await page.getByPlaceholder(/템플릿 이름/).fill("E2E 강사 포함 템플릿");
    await page.getByRole("button", { name: /^저장$/ }).click();

    await expect.poll(() => postBody, { timeout: 5000 }).not.toBeNull();
    expect(postBody!.name).toBe("E2E 강사 포함 템플릿");
    expect(postBody!.templateData?.sessions).toHaveLength(1);
    expect(postBody!.templateData!.sessions![0].teacherId).toBe(TEACHER_ID);
    expect(postBody!.templateData!.sessions![0].teacherName).toBe(TEACHER_NAME);
  });

  test("POST /api/templates 500 응답 시 에러 토스트 + 모달 유지", async ({ page }) => {
    await seedTeacherAndSession(page);

    await page.route("**/api/templates**", async (route: Route) => {
      const method = route.request().method();
      if (method === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Internal Server Error" }),
        });
      } else if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/schedule");
    await page.getByRole("button", { name: /^템플릿$/ }).click();
    await page.getByRole("button", { name: /현재 주를 템플릿으로 저장/ }).click();

    await page.getByPlaceholder(/템플릿 이름/).fill("실패 시나리오");
    await page.getByRole("button", { name: /^저장$/ }).click();

    await expect(page.getByText(/저장에 실패/)).toBeVisible({ timeout: 5000 });
    // 모달은 닫히지 않아야 한다 (입력 필드가 여전히 보임)
    await expect(page.getByPlaceholder(/템플릿 이름/)).toBeVisible();
  });
});
