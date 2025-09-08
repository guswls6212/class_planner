import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // localStorage에서 테마 설정 불러오기
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || 'dark'; // 기본값은 다크모드
  });

  // 인증 상태 캐싱은 현재 사용하지 않음 (향후 확장을 위해 주석으로 유지)

  useEffect(() => {
    console.log('🔄 ThemeContext useEffect 실행됨 - 테마:', theme);

    // 테마 변경 시 localStorage에 저장
    localStorage.setItem('theme', theme);

    // body에 테마 클래스 적용 (브라우저 환경에서만)
    if (typeof document !== 'undefined' && document.body) {
      document.body.setAttribute('data-theme', theme);
    }

    // Supabase에 테마 설정 저장 (로그인된 사용자에게만)
    const saveThemeToSupabase = async () => {
      console.log('🎨 테마 저장 시도:', theme);

      // 인증 상태 먼저 확인
      console.log('🔍 사용자 ID 확인 시작...');

      // localStorage에서 사용자 ID 가져오기
      const userId = localStorage.getItem('supabase_user_id');

      if (!userId) {
        console.log('⚠️ localStorage에 사용자 ID 없음 - 테마 저장 건너뜀');
        return;
      }

      console.log('✅ 사용자 ID 확인 완료:', userId);
      console.log('💾 Supabase에 테마 저장 중...', theme);

      try {
        console.log('🔍 Supabase 업데이트 쿼리 실행 중...');

        // 현재 세션 상태 확인
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log('🔐 현재 세션:', session);
        console.log('🔐 세션 에러:', sessionError);

        // 인증 헤더 확인
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        console.log('👤 현재 사용자:', user);
        console.log('👤 사용자 에러:', userError);

        const { data, error } = await supabase
          .from('user_settings')
          .update({
            theme: theme,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select();

        console.log('📊 Supabase 응답:', { data, error });

        if (error) {
          console.error('❌ 테마 설정 저장 실패:', error);
          console.error('❌ 에러 코드:', error.code);
          console.error('❌ 에러 메시지:', error.message);
          console.error('❌ 에러 상세:', error.details);
        } else {
          console.log('✅ 테마 설정이 Supabase에 저장되었습니다:', theme);
          console.log('✅ 저장된 데이터:', data);
        }
      } catch (error) {
        console.error('❌ 테마 저장 중 오류:', error);
        console.error('❌ 오류 상세:', JSON.stringify(error, null, 2));
      }
    };

    saveThemeToSupabase();
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
