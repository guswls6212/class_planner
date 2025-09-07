import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// 환경 변수 확인 로깅
console.log('Supabase 설정 확인:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  isConfigured:
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key',
});

// 환경 변수가 설정되지 않은 경우 더미 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // 네트워크 타임아웃 설정 추가
    flowType: 'pkce',
  },
  // 전역 설정 추가
  global: {
    headers: {
      'X-Client-Info': 'class-planner',
    },
  },
  // 네트워크 설정
  db: {
    schema: 'public',
  },
});
