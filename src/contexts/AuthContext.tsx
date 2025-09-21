"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { logger } from "../lib/logger";
import { supabase } from "../utils/supabaseClient";

// 사용자 타입 정의
interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

// AuthContext 타입 정의
interface AuthContextType {
  // 상태
  userId: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 액션
  login: (user: User) => void;
  logout: () => void;

  // E2E 테스트 지원
  setE2EMode: (enabled: boolean) => void;
  isE2EMode: boolean;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isE2EMode, setIsE2EMode] = useState(false);

  // E2E 모드 설정
  const setE2EMode = (enabled: boolean) => {
    setIsE2EMode(enabled);
    if (enabled) {
      logger.info("AuthContext - E2E 모드 활성화");
      // E2E 모드에서는 가짜 사용자 설정
      const mockUser = {
        id: "0611d53a-faae-47d9-bd1e-54951167e482",
        email: "info365001.e2e.test@gmail.com",
        user_metadata: { name: "E2E Test User" },
      };
      setUser(mockUser);
      setUserId(mockUser.id);
      setIsLoading(false);
    }
  };

  // 로그인 함수 (useCallback으로 최적화, 중복 호출 방지)
  const login = useCallback(
    (userData: User) => {
      // 이미 같은 사용자가 로그인되어 있으면 스킵
      if (userId === userData.id) {
        return;
      }

      // 개발 환경에서만 DEBUG 레벨로 로그 스팸 방지
      if (process.env.NODE_ENV === "development") {
        logger.debug("AuthContext - 사용자 로그인", {
          userId: userData.id,
          email: userData.email,
        });
      } else {
        logger.info("AuthContext - 사용자 로그인", {
          userId: userData.id,
          email: userData.email,
        });
      }

      setUser(userData);
      setUserId(userData.id);

      // localStorage에도 저장 (기존 시스템과 호환)
      localStorage.setItem("supabase_user_id", userData.id);

      setIsLoading(false);
    },
    [userId]
  );

  // 로그아웃 함수 (useCallback으로 최적화)
  const logout = useCallback(() => {
    logger.info("AuthContext - 사용자 로그아웃");
    setUser(null);
    setUserId(null);
    setIsE2EMode(false);

    // localStorage 정리
    localStorage.removeItem("supabase_user_id");
    localStorage.removeItem("fallback-auth-token");
    localStorage.removeItem("e2e-test-mode");

    setIsLoading(false);
  }, []);

  // 초기 인증 상태 확인
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logger.debug("AuthContext - 초기 인증 상태 확인");

        // E2E 모드 확인 (현재 존재하는 토큰 기반)
        const e2eMode =
          localStorage.getItem("fallback-auth-token") === "true" ||
          localStorage.getItem("e2e-test-mode") === "true" ||
          localStorage.getItem("E2E_MODE") === "true" ||
          localStorage.getItem("PLAYWRIGHT_TEST") === "true" ||
          (typeof window !== "undefined" &&
            window.location.search.includes("e2e-test=true")) ||
          (typeof window !== "undefined" &&
            (window as any).E2E_TEST_MODE === true) ||
          (typeof window !== "undefined" &&
            (window as any).PLAYWRIGHT_TEST === true);

        console.log("🔍 AuthContext E2E 모드 확인:", {
          fallbackToken: localStorage.getItem("fallback-auth-token"),
          e2eTestMode: localStorage.getItem("e2e-test-mode"),
          E2E_MODE: localStorage.getItem("E2E_MODE"),
          PLAYWRIGHT_TEST: localStorage.getItem("PLAYWRIGHT_TEST"),
          windowE2E:
            typeof window !== "undefined"
              ? (window as any).E2E_TEST_MODE
              : "N/A",
          windowPlaywright:
            typeof window !== "undefined"
              ? (window as any).PLAYWRIGHT_TEST
              : "N/A",
          e2eMode,
          allKeys: Object.keys(localStorage),
        });

        if (e2eMode) {
          logger.info("🎯 AuthContext - E2E 모드 감지, 즉시 활성화");
          console.log("🎯 AuthContext E2E 모드 활성화!");
          setE2EMode(true);
          return;
        }

        // 일반 모드: localStorage에서 사용자 ID 확인
        const storedUserId = localStorage.getItem("supabase_user_id");

        if (storedUserId) {
          logger.debug("AuthContext - localStorage에서 사용자 ID 발견", {
            userId: storedUserId,
          });

          // Supabase 세션 확인
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            logger.error(
              "AuthContext - 세션 확인 실패",
              undefined,
              error as Error
            );
            logout();
            return;
          }

          if (session?.user) {
            logger.info("AuthContext - 유효한 세션 확인", {
              userId: session.user.id,
            });
            login(session.user);
          } else {
            logger.warn("AuthContext - 유효하지 않은 세션, 로그아웃 처리");
            logout();
          }
        } else {
          logger.debug("AuthContext - 저장된 사용자 ID 없음");
          setIsLoading(false);
        }
      } catch (error) {
        logger.error("AuthContext - 초기화 중 오류", undefined, error as Error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Supabase 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("AuthContext - 인증 상태 변화", {
        event,
        hasSession: !!session,
      });

      // 중복 호출 방지: 이미 같은 사용자가 로그인되어 있으면 스킵
      if (event === "SIGNED_IN" && session?.user) {
        if (userId !== session.user.id) {
          login(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        if (userId) {
          // 이미 로그아웃 상태가 아닐 때만
          logout();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [login, logout, userId]);

  const value: AuthContextType = {
    userId,
    user,
    isAuthenticated: !!userId,
    isLoading,
    login,
    logout,
    setE2EMode,
    isE2EMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// 편의 훅들
export function useUserId(): string | null {
  const { userId } = useAuth();
  return userId;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
