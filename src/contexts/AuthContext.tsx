"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { logger } from "../lib/logger";
import { supabase } from "../utils/supabaseClient";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
});

/**
 * AuthProvider — supabase auth session/user를 단일 source로 통합.
 * 모든 페이지/컴포넌트가 useAuth() 훅으로 access.
 *
 * 이전엔 13개 사용처가 직접 supabase.auth.getSession() 호출 → 매 mount RTT.
 * 지금은 layout root에서 1회 초기화 + onAuthStateChange listener 1개로 단일화.
 * supabase-js 자체 cache에 의존하므로 실제 network는 한 번이지만, 코드 일관성 +
 * listener 단일화 + race timeout pattern을 한 곳에 모음.
 *
 * Timeout 7s: AuthGuard에서 사용한 패턴 그대로 — SW activate + cross-origin fetch
 * 누적 latency 방어. timeout 시 loading=false + session=null로 진입(unauthenticated).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const timeoutId = setTimeout(() => {
      if (mounted) {
        logger.warn("AuthProvider - getSession timeout (7s) — proceed as unauthenticated");
        setLoading(false);
      }
    }, 7000);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        if (error) {
          logger.error("AuthProvider - getSession 실패", undefined, error as Error);
        }
        setSession(data?.session ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        logger.error("AuthProvider - getSession 예외", undefined, err as Error);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — AuthContext에서 user/session/loading 가져옴.
 * 사용 패턴:
 *   const { user, session, loading } = useAuth();
 *   if (loading) return <Spinner />;
 *   if (!user) return <Login />;
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
