import { chromium } from "playwright";

const base = "http://localhost:3000";

// weekday 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
// Today is 2026-04-18 (Saturday) → selectedWeekday=5
const SEED = {
  students: [
    { id: "stu-1", name: "김철수" },
    { id: "stu-2", name: "이영희" },
    { id: "stu-3", name: "박지훈" },
  ],
  subjects: [
    { id: "subj-1", name: "수학", color: "#e74c3c" },
    { id: "subj-2", name: "영어", color: "#3498db" },
  ],
  enrollments: [
    { id: "enr-1", studentId: "stu-1", subjectId: "subj-1" },
    { id: "enr-2", studentId: "stu-2", subjectId: "subj-1" },
    { id: "enr-3", studentId: "stu-3", subjectId: "subj-2" },
  ],
  sessions: [
    // Mon: two overlapping sessions (D-hybrid overlap test)
    { id: "sess-1", enrollmentIds: ["enr-1"], weekday: 0, startsAt: "09:00", endsAt: "10:00", yPosition: 0 },
    { id: "sess-2", enrollmentIds: ["enr-2"], weekday: 0, startsAt: "09:30", endsAt: "10:30", yPosition: 0 },
    // Wed: single session
    { id: "sess-3", enrollmentIds: ["enr-3"], weekday: 2, startsAt: "14:00", endsAt: "15:00", yPosition: 0 },
    // Sat (today, weekday=5): for daily view
    { id: "sess-4", enrollmentIds: ["enr-1"], weekday: 5, startsAt: "10:00", endsAt: "11:00", yPosition: 0 },
  ],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
const results = [];

async function makeContext(viewMode) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  // Store as JSON since useLocal uses JSON.parse/stringify
  await page.addInitScript(({ seed, view }) => {
    localStorage.setItem("classPlannerData:anonymous", JSON.stringify(seed));
    localStorage.setItem("ui:scheduleView", JSON.stringify(view));
  }, { seed: SEED, view: viewMode });
  return { ctx, page };
}

async function check(label, url, viewMode) {
  const { ctx, page } = await makeContext(viewMode);
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate((vm) => {
    // SessionCard primitives (daily=row, monthly=chip, preview on landing)
    const variants = [...document.querySelectorAll("[data-variant]")]
      .map((el) => el.getAttribute("data-variant"));
    const states = [...document.querySelectorAll("[data-state]")]
      .map((el) => el.getAttribute("data-state"));

    // SessionBlock (weekly/legacy) uses data-testid
    const sessionBlocks = [...document.querySelectorAll("[data-testid^='session-block-']")].length;

    const preview = !!document.querySelector("[data-testid='schedule-preview']");
    const emptyMsg = document.body.innerText.includes("수업이 없습니다");
    const storedView = (() => {
      try { return JSON.parse(localStorage.getItem("ui:scheduleView") || 'null'); } catch { return null; }
    })();

    return {
      variantCounts: variants.reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {}),
      stateCounts: states.reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {}),
      sessionBlocks,
      preview,
      emptyMsg,
      storedView,
      totalVariants: variants.length,
    };
  }, viewMode);

  await page.screenshot({ path: `/tmp/verify-${label}.png`, fullPage: false });
  results.push({ label, url, viewMode, info });
  await ctx.close();
}

// Landing page (no view mode)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const variants = [...document.querySelectorAll("[data-variant]")]
      .map((el) => el.getAttribute("data-variant"));
    const preview = !!document.querySelector("[data-testid='schedule-preview']");
    return {
      variantCounts: variants.reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {}),
      preview,
      total: variants.length,
    };
  });
  await page.screenshot({ path: "/tmp/verify-landing.png", fullPage: false });
  results.push({ label: "landing", url: `${base}/`, info });
  await ctx.close();
}

await check("weekly", `${base}/schedule`, "weekly");
await check("daily", `${base}/schedule`, "daily");
await check("monthly", `${base}/schedule`, "monthly");

await browser.close();
console.log(JSON.stringify(results, null, 2));
