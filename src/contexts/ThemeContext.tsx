import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useUserSettings } from "../hooks/useUserSettings";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light"); // 기본값을 light로 변경
  const [isClient, setIsClient] = useState(false);

  // user_settings에서 테마 설정 가져오기
  const { settings, updateTheme } = useUserSettings();

  // 클라이언트 사이드에서만 localStorage 접근
  useEffect(() => {
    setIsClient(true);

    // user_settings에서 테마 설정이 있으면 우선 사용
    if (settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    } else if (typeof window !== "undefined" && !settings.theme) {
      // user_settings에 테마가 없으면 localStorage에서 가져오기
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme);
      }
    }
  }, [settings.theme, theme]);

  // 인증 상태 캐싱은 현재 사용하지 않음 (향후 확장을 위해 주석으로 유지)

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (!isClient) return;

    // 테마 변경 시 localStorage에 저장
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }

    // body에 테마 클래스 적용 (브라우저 환경에서만)
    if (typeof document !== "undefined" && document.body) {
      document.body.setAttribute("data-theme", theme);
    }
  }, [theme, isClient]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    // user_settings에 테마 설정 저장 (로그인된 사용자에게만)
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("supabase_user_id");

      if (userId && updateTheme) {
        try {
          await updateTheme(newTheme);
          console.log("✅ 테마 설정 저장 완료:", newTheme);
        } catch (error) {
          console.error("❌ 테마 저장 중 오류:", error);
        }
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
