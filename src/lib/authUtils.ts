import { supabase } from "../utils/supabaseClient";

/**
 * Supabase 세션에서 access_token을 가져온다.
 * localStorage 키를 하드코딩하지 않고 SDK를 통해 안전하게 획득.
 */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    return null;
  }
  return session.access_token;
}
