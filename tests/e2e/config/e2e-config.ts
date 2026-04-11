/**
 * E2E 테스트 공통 설정
 */
export const E2E_CONFIG = {
  TEST_USER_ID: "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391",
  TEST_EMAIL: "info365001.e2e.test@gmail.com",
  SUPABASE_TOKEN_KEY: "sb-iqzcnyujkagwgshbecpg-auth-token",
  BASE_URL: "http://localhost:3000", // E2E 테스트 전용 포트
  TIMEOUTS: {
    AUTH_WAIT: 15000,
    STUDENT_ADD_WAIT: 5000,
    STUDENT_VISIBLE_WAIT: 15000,
    PAGE_LOAD: 10000,
    ELEMENT_WAIT: 5000,
  },
} as const;

/**
 * E2E 테스트용 인증 데이터 생성
 */
export function createAuthData(userId: string, email: string) {
  return {
    access_token: `eyJhbGciOiJIUzI1NiIsImtpZCI6IjFjUzJoOWJGcE9QVjVkWE0iLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzI3MDU5ODMyLCJpYXQiOjE3MjcwNTYyMzIsImlzcyI6Imh0dHBzOi8va2N5cWZ0YXNkeHRxc2xyaGJjdHYuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IiR7dXNlcklkfSIsImVtYWlsIjoiJHtlbWFpbH0iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsibmFtZSI6IkUyRSBUZXN0IFVzZXIiLCJlbWFpbCI6IiR7ZW1haWx9IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3MjcwNTYyMzJ9XSwic2Vzc2lvbl9pZCI6ImE1NjE3ZjJiLWIwZjUtNGU5Mi1hYjVjLWQwMzQ5MmFkZGRhMyIsImlzX2Fub255bW91cyI6ZmFsc2V9.test-signature`,
    refresh_token: "test-refresh-token",
    expires_at: Date.now() + 3600000,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: userId,
      email: email,
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: new Date().toISOString(),
      phone: "",
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {
        provider: "google",
        providers: ["google"],
      },
      user_metadata: {
        name: "E2E Test User",
        email: email,
        email_verified: true,
        phone_verified: false,
      },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * E2E 테스트용 기본 데이터 생성
 */
export function createDefaultData() {
  return {
    students: [
      {
        id: "test-student-1",
        name: "테스트 학생 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    subjects: [
      {
        id: "test-subject-1",
        name: "테스트 과목 1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    enrollments: [],
  };
}

/**
 * E2E 테스트 인증 설정 헬퍼 함수
 */
export async function setupE2EAuth(page: any, customData?: any) {
  console.log("🔐 E2E 테스트 인증 설정");

  await page.addInitScript(
    ({ config, authData, defaultData }: { config: typeof E2E_CONFIG; authData: any; defaultData: any }) => {
      console.log("🚀 E2E 환경 설정 중...");

      // 사용자 ID 설정
      localStorage.setItem("supabase_user_id", config.TEST_USER_ID);

      // 실제 Supabase 인증 토큰 설정
      localStorage.setItem(config.SUPABASE_TOKEN_KEY, JSON.stringify(authData));

      // 기본 데이터 설정
      localStorage.setItem("classPlannerData", JSON.stringify(defaultData));

      console.log("✅ E2E 환경 설정 완료");
    },
    {
      config: E2E_CONFIG,
      authData: createAuthData(E2E_CONFIG.TEST_USER_ID, E2E_CONFIG.TEST_EMAIL),
      defaultData: customData || createDefaultData(),
    }
  );
}

/**
 * E2E 테스트 페이지 로드 및 인증 확인 헬퍼 함수
 */
export async function loadPageWithAuth(page: any, path: string) {
  await page.goto(`${E2E_CONFIG.BASE_URL}${path}`);

  // 인증된 페이지인 경우 로그인 상태 확인
  if (path !== "/" && path !== "/login" && path !== "/about") {
    await page.waitForSelector("h1, h2", {
      timeout: E2E_CONFIG.TIMEOUTS.AUTH_WAIT,
    });
  }

  console.log(`✅ 페이지 로드 완료: ${path}`);
}
