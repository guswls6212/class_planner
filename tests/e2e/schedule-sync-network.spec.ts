/**
 * 인증 사용자 sync 흐름 — POST/PUT 호출 자체를 network 레벨에서 검증.
 *
 * 회귀 가드 핵심:
 * - PR #203에서 POST /api/sessions 호출 0건 사고 (addSession이 sync 안 부름) 발견.
 *   "API mock 응답이 200/201이라도 client가 안 부르면 e2e가 못 잡는다" — page.waitForRequest로
 *   호출 자체를 assert.
 * - body.id가 client UUID여야 함 (이전엔 server가 자체 UUID 발급 → ID 불일치 → ghost).
 *
 * Network mocking 방식: page.route로 모든 /api/sessions, /api/enrollments POST/PUT을
 * 200/201로 응답해 actual server 의존도 제거. 호출 자체와 body shape만 검증.
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  modifierDrag,
  plainDrag,
} from "./helpers/dnd-helpers";
import {
  sessionBlock,
  sessionDragHandle,
  dropCell,
} from "./helpers/multi-select-helpers";
import {
  currentWeekMondayKST,
  seedAuthenticated,
} from "./helpers/seed-anonymous";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WEEK = currentWeekMondayKST();

/**
 * Mock POST/PUT/DELETE for /api/sessions, /api/enrollments — 호출 자체와 body shape 검증만.
 *
 * 중요: GET은 mock 안 함 — Local-First sync 로직이 server response로 local을 overwrite
 * 할 수 있어 localStorage seed가 사라짐. GET을 그대로 두면 401(mock token 무효)로
 * silently fail, local이 SSOT로 유지됨.
 *
 * 그 외 GET (학생/과목/teacher 등)도 mock 안 함 — 같은 이유.
 */
async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/sessions**", async (route: Route) => {
    const method = route.request().method();
    if (method === "POST" || method === "PUT") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: method === "POST" ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: body.id ?? "server-generated", ...body },
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.route("**/api/enrollments**", async (route: Route) => {
    if (route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: body }),
      });
      return;
    }
    await route.continue();
  });
}

test.describe("Sync network calls — authenticated user (Chromium only)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "Network assertion 안정성 위해 chromium만 — 다른 browser는 별도 작업",
  );

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    // 인증된 사용자로 setup — userId + classPlannerData:${userId} seed.
    // JWT는 설정 안 함 — sync 코드 경로는 userId만 보고 fetch 발사. server 인증은
    // mockApi가 처리.
    await seedAuthenticated(page, TEST_USER_ID, {
      students: [{ id: "stu-1", name: "학생 A" }],
      subjects: [{ id: "sub-1", name: "수학", color: "#7DD3FC" }],
      enrollments: [{ id: "enr-1", studentId: "stu-1", subjectId: "sub-1" }],
      sessions: [
        {
          id: "sess-existing",
          subjectId: "sub-1",
          weekday: 0,
          startsAt: "09:00",
          endsAt: "10:00",
          weekStartDate: WEEK,
          enrollmentIds: ["enr-1"],
          yPosition: 1,
        },
      ],
    });
    await page.goto("/schedule");
    await page.waitForSelector('[data-testid="time-table-grid"]', { timeout: 15000 });
  });

  test("T15 — 단일 drag → PUT /api/sessions/:id/position 호출", async ({
    page,
  }) => {
    await page.waitForSelector('[data-testid="session-block-sess-existing"]', {
      timeout: 8000,
    });

    const putPromise = page.waitForRequest(
      (req) =>
        req.method() === "PUT" &&
        /\/api\/sessions\/[\w-]+\/position/.test(req.url()),
      { timeout: 10000 },
    );

    await sessionBlock(page, "sess-existing").hover();
    await plainDrag(
      page,
      sessionDragHandle(page, "sess-existing"),
      dropCell(page, 1, "11:00"),
    );

    const req = await putPromise;
    expect(req.url()).toMatch(/\/api\/sessions\/sess-existing\/position/);
    expect(req.url()).toContain("userId="); // 회귀 가드 (PR #194 fix — userId 쿼리 누락 사고)
    const body = JSON.parse(req.postData() || "{}");
    // syncSessionUpdateAsync는 API 스펙 필드명 사용: weekday/time/endTime/yPosition
    expect(body).toMatchObject({
      weekday: expect.any(Number),
      time: expect.any(String),
      endTime: expect.any(String),
    });
  });

  test("T16 — Cmd-drag 복사 → POST /api/sessions 호출 (body.id는 client UUID)", async ({
    page,
  }) => {
    await page.waitForSelector('[data-testid="session-block-sess-existing"]', {
      timeout: 8000,
    });

    const postPromise = page.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        /\/api\/sessions(\?|$)/.test(req.url()),
      { timeout: 10000 },
    );

    await sessionBlock(page, "sess-existing").hover();
    await modifierDrag(
      page,
      sessionDragHandle(page, "sess-existing"),
      dropCell(page, 1, "11:00"),
      "Meta",
    );

    const req = await postPromise;
    const body = JSON.parse(req.postData() || "{}");
    // PR #203 핵심 회귀 가드: client UUID가 body.id에 포함되어야 server가 그 ID로 INSERT.
    expect(body.id).toMatch(UUID_PATTERN);
    // 새 ID이므로 기존 ID와 달라야 함
    expect(body.id).not.toBe("sess-existing");
    expect(body.weekday).toBeDefined();
    expect(body.startsAt).toBeDefined();
  });

  test("T14 — Modal로 수업 추가 → POST /api/sessions called", async ({
    page,
  }) => {
    // GroupSessionModal이 enrollment + session을 모두 만들기 때문에
    // POST /api/sessions가 발화돼야 함 (PR #203 회귀 사고의 핵심).
    test.skip(
      true,
      "GroupSessionModal flow는 학생/과목 setup 등 dependency가 많아 별도 spec에서 다룸. T15/T16이 sync POST 회귀를 충분히 가드함.",
    );
  });
});
