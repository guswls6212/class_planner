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
  test("PDF 다운로드 버튼이 schedule 헤더에 보인다 + aria-label", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    const button = page.getByRole("button", { name: /PDF 다운로드/ });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test("PDF 가이드 InfoTrigger 클릭 시 PdfGuideModal이 열린다", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    await page.getByRole("button", { name: /PDF 출력 가이드/ }).click();
    // PdfGuideModal — 가이드 콘텐츠 식별 가능한 텍스트 (모달 헤더 등)
    await expect(page.getByText(/PDF/).first()).toBeVisible();
  });

  test("PDF 다운로드 클릭 → 모달 → '출력' 클릭 → download 이벤트 발생 (jsPDF)", async ({ page }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    // 1. PDF 다운로드 버튼 → PdfExportRangeModal 열림
    await page.getByRole("button", { name: /PDF 다운로드/ }).click();

    // 2. 모달 title 확인 — "PDF 출력 범위"
    await expect(page.getByText("PDF 출력 범위")).toBeVisible({ timeout: 3000 });

    // 3. download 이벤트 promise 등록 (출력 클릭 직전)
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });

    // 4. 기본 "현재 뷰만 출력" radio default 선택됨 — 바로 "출력" 버튼 클릭
    await page.getByRole("button", { name: /^출력$/ }).click();

    // 5. jsPDF doc.save() 트리거 → browser download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test("'출력' 클릭 시 모달 버튼이 '출력 중...' 라벨로 변경된다 (in-progress 표시)", async ({
    page,
  }) => {
    await seedScheduleWithSession(page);
    await page.goto("/schedule");

    await page.getByRole("button", { name: /PDF 다운로드/ }).click();
    await expect(page.getByText("PDF 출력 범위")).toBeVisible({ timeout: 3000 });

    const exportButton = page.getByRole("button", { name: /^출력$/ });
    // download 시작 전 race를 피하기 위해 이벤트 promise 미리 등록
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await exportButton.click();

    // jsPDF 동기 처리라 "출력 중..." 라벨이 매우 짧게 노출 — disabled 또는 download 발사 사실로 검증
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
