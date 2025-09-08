import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 타입 정의
export interface Database {
  public: {
    Tables: {
      user_data: {
        Row: {
          id: string;
          user_id: string;
          data: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          settings: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          settings?: unknown;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_activity_logs: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          activity_data: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          activity_data: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          activity_data?: unknown;
          created_at?: string;
        };
      };
      migration_log: {
        Row: {
          id: string;
          migration_name: string;
          executed_at: string;
          status: string;
          description: string;
        };
        Insert: {
          id?: string;
          migration_name: string;
          executed_at?: string;
          status: string;
          description: string;
        };
        Update: {
          id?: string;
          migration_name?: string;
          executed_at?: string;
          status?: string;
          description?: string;
        };
      };
    };
  };
}

// 타입이 적용된 Supabase 클라이언트
export const typedSupabase = supabase as unknown;

// 유틸리티 함수들
export const supabaseUtils = {
  // 사용자 프로필 생성
  async createUserProfile(
    userId: string,
    email: string,
    name: string,
    avatarUrl?: string
  ) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        email,
        name,
        avatar_url: avatarUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('사용자 프로필 생성 실패:', error);
      throw error;
    }

    return data;
  },

  // 사용자 프로필 조회
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('사용자 프로필 조회 실패:', error);
      throw error;
    }

    return data;
  },

  // 사용자 데이터 저장
  async saveUserData(userId: string, data: unknown) {
    const { data: result, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('사용자 데이터 저장 실패:', error);
      throw error;
    }

    return result;
  },

  // 사용자 데이터 조회
  async getUserData(userId: string) {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('사용자 데이터 조회 실패:', error);
      throw error;
    }

    return data;
  },

  // 활동 로그 기록
  async logActivity(
    userId: string,
    activityType: string,
    activityData: unknown
  ) {
    const { data, error } = await supabase.from('user_activity_logs').insert({
      user_id: userId,
      activity_type: activityType,
      activity_data: activityData,
    });

    if (error) {
      console.error('활동 로그 기록 실패:', error);
      // 로그 기록 실패는 앱 동작에 영향을 주지 않도록 에러를 던지지 않음
    }

    return data;
  },
};

export default supabase;
