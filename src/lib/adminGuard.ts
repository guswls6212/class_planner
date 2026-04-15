import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * JWT에서 이메일을 추출한다 (서버 사이드).
 * Authorization: Bearer <jwt> 헤더를 파싱하여 Supabase로 검증.
 * 성공 시 email 반환, 실패 시 null 반환.
 */
export async function getAuthenticatedEmail(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const jwt = authHeader.slice("Bearer ".length);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(jwt);

  if (error || !data.user?.email) {
    return null;
  }

  return data.user.email;
}

/**
 * 이메일 화이트리스트 검사.
 * process.env.ADMIN_EMAILS를 콤마로 split, trim, lowercase 처리 후 비교.
 * env 누락 또는 email이 null이면 false (fail-closed).
 */
export function isDeveloperEmail(email: string | null): boolean {
  if (!email) return false;

  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return false;

  const whitelist = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return whitelist.includes(email.toLowerCase());
}

/**
 * getAuthenticatedEmail + isDeveloperEmail 합성.
 * 성공: { ok: true, email }
 * 실패: { ok: false, response: 403 NextResponse }
 *
 * route handler 사용 예:
 *   const guard = await requireDeveloper(request);
 *   if (!guard.ok) return guard.response;
 */
export async function requireDeveloper(
  request: NextRequest
): Promise<{ ok: true; email: string } | { ok: false; response: NextResponse }> {
  const email = await getAuthenticatedEmail(request);

  if (!isDeveloperEmail(email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, email: email as string };
}
