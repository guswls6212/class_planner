import type { Page } from "@playwright/test";

/**
 * Anonymous(비로그인) e2e용 localStorage seed.
 *
 * 앱은 supabase_user_id 부재 시 `classPlannerData:anonymous` key를 SSOT로 사용.
 * page.addInitScript로 페이지 로드 전 inject — 첫 데이터 로드 시점부터 데이터 보임.
 *
 * setupE2EAuth와 다른 이유: 인증 토큰 없이 anonymous mode로만 동작하는
 * 시나리오에서 sessions/students/subjects/enrollments를 한번에 seed.
 */

export interface SeedSession {
  id: string;
  subjectId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  weekStartDate: string;
  enrollmentIds: string[];
  yPosition: number;
  room?: string;
  teacherId?: string | null;
}

export interface SeedStudent {
  id: string;
  name: string;
}

export interface SeedSubject {
  id: string;
  name: string;
  color: string;
}

export interface SeedEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

export interface SeedData {
  students?: SeedStudent[];
  subjects?: SeedSubject[];
  sessions?: SeedSession[];
  enrollments?: SeedEnrollment[];
}

/**
 * 표시 중인 주의 월요일을 KST 기준으로 계산.
 * Playwright는 testInfo의 시각 기준 — 테스트 실행 시점 주를 사용.
 */
export function currentWeekMondayKST(): string {
  const now = new Date();
  // KST는 UTC+9 — Date 객체에 9시간 더해서 계산
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kst.getUTCDay(); // 0=Sun
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(kst);
  mon.setUTCDate(kst.getUTCDate() + daysToMonday);
  return mon.toISOString().slice(0, 10);
}

/**
 * 기본 seed: 학생 3명 + 과목 1개 + 같은 weekStart의 sessions.
 * 호출자가 sessions만 전달하면 나머지는 default로 채움.
 */
export function makeDefaultSeed(sessions: SeedSession[]): Required<SeedData> {
  const defaultStudents: SeedStudent[] = [
    { id: "stu-1", name: "학생 A" },
    { id: "stu-2", name: "학생 B" },
    { id: "stu-3", name: "학생 C" },
  ];
  const defaultSubjects: SeedSubject[] = [
    { id: "sub-1", name: "수학", color: "#7DD3FC" },
  ];
  const defaultEnrollments: SeedEnrollment[] = [
    { id: "enr-1", studentId: "stu-1", subjectId: "sub-1" },
    { id: "enr-2", studentId: "stu-2", subjectId: "sub-1" },
    { id: "enr-3", studentId: "stu-3", subjectId: "sub-1" },
  ];
  return {
    students: defaultStudents,
    subjects: defaultSubjects,
    enrollments: defaultEnrollments,
    sessions,
  };
}

/**
 * 페이지 로드 전 anonymous classPlannerData를 localStorage에 inject.
 *
 * 사용법:
 *   await seedAnonymous(page, makeDefaultSeed([
 *     { id: 's1', subjectId: 'sub-1', weekday: 0, startsAt: '09:00', endsAt: '10:00',
 *       weekStartDate: currentWeekMondayKST(), enrollmentIds: ['enr-1'], yPosition: 1 },
 *   ]));
 *   await page.goto('/schedule');
 */
export async function seedAnonymous(
  page: Page,
  data: SeedData,
): Promise<void> {
  await page.addInitScript((seed) => {
    const payload = {
      students: seed.students ?? [],
      subjects: seed.subjects ?? [],
      sessions: seed.sessions ?? [],
      enrollments: seed.enrollments ?? [],
      teachers: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };
    // anonymous mode: supabase_user_id를 명시적으로 비워서 localStorageCrud의
    // getStorageKey가 ANONYMOUS_STORAGE_KEY를 반환하도록.
    localStorage.removeItem("supabase_user_id");
    localStorage.setItem("classPlannerData:anonymous", JSON.stringify(payload));
  }, data);
}

/**
 * 인증된 사용자 mode 시드 — sync 호출(POST/PUT) 검증 e2e용.
 *
 * `supabase_user_id` + `classPlannerData:${userId}` 작성. JWT는 설정 안 함 — server
 * 인증 체크는 mock 또는 401 fail-silent로 대체. 핵심은 client-side sync 코드 경로가
 * userId를 localStorage에서 읽어 fetch를 발사하는 것.
 *
 * 주의: GET /api/* response가 local을 덮어쓰지 않게 호출자가 page.route로 GET을
 * mock하지 않거나 신중히 mock해야 함.
 */
export async function seedAuthenticated(
  page: Page,
  userId: string,
  data: SeedData,
): Promise<void> {
  await page.addInitScript(
    ({ uid, seed }) => {
      const payload = {
        students: seed.students ?? [],
        subjects: seed.subjects ?? [],
        sessions: seed.sessions ?? [],
        enrollments: seed.enrollments ?? [],
        teachers: [],
        version: "1.0",
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem("supabase_user_id", uid);
      // 기본 (single-academy) key — academyId 없이 `classPlannerData:${userId}`
      localStorage.setItem(`classPlannerData:${uid}`, JSON.stringify(payload));
    },
    { uid: userId, seed: data },
  );
}
