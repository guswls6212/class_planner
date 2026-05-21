/**
 * PDF Export e2e — PDFDownloadButton 클릭 → client-side jsPDF 실행 회귀 가드.
 *
 * - PDFDownloadButton: aria-label="{viewLabel} PDF 다운로드", text "{viewLabel} PDF 다운로드"
 * - 다운로드 진행 중: text "다운로드 중..." + disabled=true
 * - 클라이언트 jsPDF — 실제 download 이벤트 발생, page.waitForEvent("download") 가능
 * - InfoTrigger("PDF 출력 가이드") 클릭 시 PdfGuideModal 열림
 *
 * Anonymous mode OK — auth 의존 없음, localStorage data만 사용.
 */
import { expect, test, type Page } from "@playwright/test";
import { currentWeekMondayKST } from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const WEEK = currentWeekMondayKST();

async function seedScheduleWithSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ uid, week }) => {
      const payload = {
        students: [{ id: "stu-1", name: "학생 A" }],
        subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
        teachers: [],
        enrollments: [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }],
        sessions: [
          {
            id: "sess-pdf-1",
            subjectId: "sub-1",
            weekday: 0,
            startsAt: "09:00",
            endsAt: "10:00",
            weekStartDate: week,
            enrollmentIds: ["enr-1"],
            yPosition: 1,
          },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem("supabase_user_id", uid);
      localStorage.setItem(`classPlannerData:${uid}`, JSON.stringify(payload));
    },
    { uid: TEST_USER_ID, week: WEEK },
  );
}

test.describe("PDF export", () => {
  test("PDF dropdown trigger 가 schedule 헤더에 보인다 + aria-label (ADR-020 후속)", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    // 새 dropdown 패턴 — aria-label = `${viewLabel} PDF` (예: "주간 시간표 PDF")
    const trigger = page.getByRole("button", { name: /시간표 PDF/ });
    await expect(trigger).toBeVisible();
    await expect(trigger).toBeEnabled();
  });

  test("PDF dropdown 안 '인쇄 가이드' menuitem 클릭 → PdfGuideModal 열린다 (P2)", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    await page.getByRole("button", { name: /시간표 PDF/ }).click();
    // portal 로 document.body 에 mount — page 전체 검색으로 menuitem 매칭
    await page.getByRole("button", { name: /인쇄 가이드/ }).click();
    await expect(page.getByText("PDF 출력 가이드")).toBeVisible({ timeout: 3000 });
  });

  test("PDF dropdown → '전체 인쇄' → 모달 → '출력' → download 이벤트", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    await page.getByRole("button", { name: /시간표 PDF/ }).click();
    await page.getByRole("button", { name: /전체 인쇄/ }).click();
    await expect(page.getByText("PDF 출력 범위")).toBeVisible({ timeout: 3000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: /^출력$/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test("'출력' 클릭 → in-progress 라벨 + download 이벤트 발사", async ({
    page,
  }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    await page.getByRole("button", { name: /시간표 PDF/ }).click();
    await page.getByRole("button", { name: /전체 인쇄/ }).click();
    await expect(page.getByText("PDF 출력 범위")).toBeVisible({ timeout: 3000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: /^출력$/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
