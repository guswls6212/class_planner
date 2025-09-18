import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { logger } from "../lib/logger";

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
  const [theme, setTheme] = useState<Theme>("dark"); // 기본값을 dark로 변경
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 localStorage 접근
  useEffect(() => {
    setIsClient(true);

    // localStorage에서 테마 설정 가져오기 (한 번만 실행)
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme);
      }
    }
  }, []); // 의존성 배열을 빈 배열로 변경하여 한 번만 실행

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

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    logger.info("✅ 테마 전환:", { newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
