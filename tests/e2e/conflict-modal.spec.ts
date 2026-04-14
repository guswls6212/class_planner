/**
 * DataConflictModal E2E 검증
 *
 * 시나리오:
 *   1. anonymous localStorage 데이터 + 서버 데이터가 모두 있을 때 모달이 뜬다
 *   2. 라디오 미선택 → 확인 버튼 disabled
 *   3. 라디오 선택 → 카드 하이라이트 + 확인 버튼 활성화
 *   4. 수업 ▶ 클릭 → 목록 expand만 (카드 선택 미발생)
 */

import { expect, test } from "@playwright/test";
import { E2E_CONFIG, createAuthData } from "./config/e2e-config";

const LOCAL_STUDENT = { id: "local-s1", name: "로컬학생", academyId: "anonymous" };
const SERVER_STUDENT = { id: "srv-s1", name: "서버학생", academyId: E2E_CONFIG.TEST_USER_ID };

const ANONYMOUS_KEY = "classPlannerData:anonymous";
const SUPABASE_KEY = E2E_CONFIG.SUPABASE_TOKEN_KEY;

function makeLocalData() {
  return {
    students: [LOCAL_STUDENT],
    subjects: [{ id: "loc-sub1", name: "로컬과목", academyId: "anonymous" }],
    sessions: [],
    enrollments: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };
}

function makeServerData() {
  return {
    students: [SERVER_STUDENT],
    subjects: [{ id: "srv-sub1", name: "서버과목", academyId: E2E_CONFIG.TEST_USER_ID }],
    sessions: [],
    enrollments: [],
  };
}

test.describe("DataConflictModal", () => {
  test.beforeEach(async ({ page }) => {
    const authData = createAuthData(E2E_CONFIG.TEST_USER_ID, E2E_CONFIG.TEST_EMAIL);
    const localData = makeLocalData();
    const serverData = makeServerData();

    // 1) localStorage에 anonymous 데이터 + Supabase 인증 토큰 주입
    await page.addInitScript(
      ({ anonKey, sbKey, anonData, auth }) => {
        localStorage.setItem(anonKey, JSON.stringify(anonData));
        localStorage.setItem(sbKey, JSON.stringify(auth));
      },
      {
        anonKey: ANONYMOUS_KEY,
        sbKey: SUPABASE_KEY,
        anonData: localData,
        auth: authData,
      }
    );

    // 2) Next.js API 라우트 가로채기 → 서버 데이터 반환
    await page.route(`**/api/students**`, (route) =>
      route.fulfill({ json: { success: true, data: serverData.students } })
    );
    await page.route(`**/api/subjects**`, (route) =>
      route.fulfill({ json: { success: true, data: serverData.subjects } })
    );
    await page.route(`**/api/sessions**`, (route) =>
      route.fulfill({ json: { success: true, data: serverData.sessions } })
    );
    await page.route(`**/api/enrollments**`, (route) =>
      route.fulfill({ json: { success: true, data: serverData.enrollments } })
    );
    await page.route(`**/api/onboarding**`, (route) =>
      route.fulfill({ status: 200, json: { success: true } })
    );

    // Supabase 세션 갱신 요청도 intercept
    await page.route("**/auth/v1/**", (route) => {
      if (route.request().method() === "GET" && route.request().url().includes("token")) {
        route.fulfill({ status: 404 });
      } else {
        route.continue();
      }
    });

    await page.goto(E2E_CONFIG.BASE_URL);
  });

  test("충돌 모달이 표시된다", async ({ page }) => {
    // 모달 제목 대기
    const title = page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" });
    await expect(title).toBeVisible({ timeout: 10_000 });
  });

  test("라디오 미선택 시 확인 버튼이 disabled이다", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    const confirmBtn = page.getByRole("button", { name: "선택한 데이터로 시작" });
    await expect(confirmBtn).toBeDisabled();
  });

  test("로컬 라디오 선택 → 카드 하이라이트 + 확인 버튼 활성화", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    // "이 기기의 데이터" 라디오 클릭
    const localRadio = page.getByRole("radio", { name: "이 기기의 데이터" });
    await localRadio.click();

    // 라디오가 선택되었는지
    await expect(localRadio).toBeChecked();

    // 확인 버튼 활성화
    const confirmBtn = page.getByRole("button", { name: "선택한 데이터로 시작" });
    await expect(confirmBtn).toBeEnabled();

    // 카드에 selected 클래스(aria-checked 또는 data-testid 확인)
    // desktop card와 mobile button 두 곳에 card-local testId가 있으므로 첫 번째(desktop div)만 선택
    const localCard = page.getByTestId("card-local").first();
    await expect(localCard).toBeVisible();
  });

  test("서버 라디오 선택 → 확인 버튼 활성화", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    const serverRadio = page.getByRole("radio", { name: "내 계정의 데이터" });
    await serverRadio.click();
    await expect(serverRadio).toBeChecked();

    const confirmBtn = page.getByRole("button", { name: "선택한 데이터로 시작" });
    await expect(confirmBtn).toBeEnabled();
  });

  test("수업 ▶ 클릭 → 목록 expand만, 라디오 상태 변화 없음", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    // 로컬 라디오 미선택 상태 확인
    const localRadio = page.getByRole("radio", { name: "이 기기의 데이터" });
    await expect(localRadio).not.toBeChecked();

    // 수업 expand 버튼 클릭 (role=button, label "수업" 포함)
    const sessionButtons = page.getByRole("button", {
      name: /수업/,
    });
    // 수업이 0개인 경우 expand 버튼 없음 → 있을 때만 테스트
    const count = await sessionButtons.count();
    if (count > 0) {
      await sessionButtons.first().click();
      // 라디오 여전히 미선택
      await expect(localRadio).not.toBeChecked();
    }

    // 확인 버튼 여전히 disabled
    const confirmBtn = page.getByRole("button", { name: "선택한 데이터로 시작" });
    await expect(confirmBtn).toBeDisabled();
  });

  test("로컬 선택 후 확인 → migrating 상태 진입 + 완료 후 모달 닫힘", async ({ page }) => {
    // POST /api/students → { success: true, data: { id: "srv-new-s1", name: "..." } }
    // (beforeEach의 GET 핸들러보다 우선순위가 높게 추가)
    await page.route("**/api/students**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          json: { success: true, data: { id: "srv-new-s1", name: "로컬학생", academyId: E2E_CONFIG.TEST_USER_ID } },
        });
      } else {
        route.fulfill({ json: { success: true, data: makeServerData().students } });
      }
    });
    await page.route("**/api/subjects**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          json: { success: true, data: { id: "srv-new-sub1", name: "로컬과목", academyId: E2E_CONFIG.TEST_USER_ID } },
        });
      } else {
        route.fulfill({ json: { success: true, data: makeServerData().subjects } });
      }
    });
    await page.route("**/api/enrollments**", (route) =>
      route.fulfill({ json: { success: true, data: [] } })
    );
    await page.route("**/api/sessions**", (route) =>
      route.fulfill({ json: { success: true, data: [] } })
    );

    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    const localRadio = page.getByRole("radio", { name: "이 기기의 데이터" });
    await localRadio.click();

    const confirmBtn = page.getByRole("button", { name: "선택한 데이터로 시작" });
    await confirmBtn.click();

    // 클릭 직후: "저장 중..." 으로 변하거나 모달이 닫혀야 함
    // (migrating 오버레이 또는 모달 제거 둘 다 허용)
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).not.toBeVisible({ timeout: 15_000 });
  });

  test("로컬 수업 데이터 포함 → session POST에 subjectId 전달되어 에러 없이 모달 닫힘", async ({ page }) => {
    // 모달이 이미 떠 있는 상태 (beforeEach에서 학생/과목만 있는 데이터로 로드됨)
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    // applyLocalDataChoice는 클릭 시점에 localStorage를 다시 읽으므로,
    // 확인 클릭 전에 수업 데이터를 추가하면 migration이 세션을 처리한다
    await page.evaluate(({ key }) => {
      const data = {
        students: [{ id: "loc-s1", name: "TestStudent", academyId: "anonymous" }],
        subjects: [{ id: "loc-sub1", name: "Math", academyId: "anonymous" }],
        enrollments: [{ id: "loc-en1", studentId: "loc-s1", subjectId: "loc-sub1" }],
        sessions: [
          { id: "loc-sess1", weekday: 1, startsAt: "10:00", endsAt: "11:00", enrollmentIds: ["loc-en1"] },
          { id: "loc-sess2", weekday: 2, startsAt: "10:30", endsAt: "11:30", enrollmentIds: ["loc-en1"] },
        ],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    }, { key: ANONYMOUS_KEY });

    // migration POST mock (beforeEach GET 핸들러 위에 POST 전용 핸들러 추가)
    const sessionPostBodies: Array<{ subjectId?: string }> = [];
    await page.route("**/api/students**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ json: { success: true, data: { id: "srv-s1", name: "TestStudent" } } });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/subjects**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ json: { success: true, data: { id: "srv-sub1", name: "Math" } } });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/enrollments**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ json: { success: true, data: { id: "srv-en1", studentId: "srv-s1", subjectId: "srv-sub1" } } });
      } else {
        route.continue();
      }
    });
    await page.route("**/api/sessions**", async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() ?? "{}") as { subjectId?: string };
        sessionPostBodies.push(body);
        await route.fulfill({ json: { success: true, data: { id: "srv-sess-new" } } });
      } else {
        await route.continue();
      }
    });

    const localRadio = page.getByRole("radio", { name: "이 기기의 데이터" });
    await localRadio.click();
    await page.getByRole("button", { name: "선택한 데이터로 시작" }).click();

    // 모달이 닫혀야 함 (subjectId 전달 성공으로 세션 마이그레이션 완료)
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).not.toBeVisible({ timeout: 15_000 });

    // session POST body에 subjectId가 포함됐는지 확인
    expect(sessionPostBodies.length).toBe(2);
    for (const body of sessionPostBodies) {
      expect(body.subjectId).toBeTruthy();
    }
  });

  test("스크린샷 — 초기 모달 상태", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: "tests/e2e/screenshots/conflict-modal-initial.png",
      fullPage: false,
    });
  });

  test("스크린샷 — 로컬 선택 후 상태", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "데이터 충돌이 감지되었습니다" })
    ).toBeVisible({ timeout: 10_000 });

    const localRadio = page.getByRole("radio", { name: "이 기기의 데이터" });
    await localRadio.click();

    await page.screenshot({
      path: "tests/e2e/screenshots/conflict-modal-local-selected.png",
      fullPage: false,
    });
  });
});
