import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
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
  const [theme, setTheme] = useState<Theme>("dark"); // 기본값으로 다크 테마 설정
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드에서만 localStorage 접근
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

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

    // Supabase에 테마 설정 저장 (로그인된 사용자에게만)
    const saveThemeToSupabase = async () => {
      // localStorage에서 사용자 ID 가져오기
      if (typeof window === "undefined") return;

      const userId = localStorage.getItem("supabase_user_id");

      if (!userId) {
        return; // 사용자 ID가 없으면 조용히 건너뜀
      }

      try {
        const { error } = await supabase
          .from("user_settings")
          .update({
            theme: theme,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select();

        if (error) {
          console.error("❌ 테마 설정 저장 실패:", error);
        }
        // 성공 시에는 로그를 출력하지 않음 (불필요한 스팸 방지)
      } catch (error) {
        console.error("❌ 테마 저장 중 오류:", error);
      }
    };

    saveThemeToSupabase();
  }, [theme, isClient]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
