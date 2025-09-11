import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kcyqftasdxtqslrhbctv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjeXFmdGFzZHh0cXNscmhiY3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzI2MjQsImV4cCI6MjA3MjU0ODYyNH0.3-ljC5L9rcl8D-eV4BcGh-jdgiVgq2MG6O_RJdshyOQ";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// 싱글톤 패턴 제거 - 매번 새로운 인스턴스 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 디버깅을 위해 window 객체에 노출
if (typeof window !== "undefined") {
  (window as { supabase?: typeof supabase }).supabase = supabase;
  console.log("🔧 Supabase 클라이언트가 window 객체에 노출됨");

  // 인증 상태 변화 감지
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔧 Supabase 클라이언트 - 인증 상태 변화:", event, !!session);
    if (event === "SIGNED_IN" && session) {
      console.log("🔧 Supabase 클라이언트 - 로그인 성공, 토큰 저장 확인");
      console.log(
        "🔧 Supabase 클라이언트 - localStorage 키들:",
        Object.keys(localStorage).filter((key) => key.startsWith("sb-"))
      );
    }
  });
}

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
    const client = SupabaseSingleton.getInstance();
    const { data, error } = await client
      .from("user_profiles")
      .insert({
        user_id: userId,
        email,
        name,
        avatar_url: avatarUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error("사용자 프로필 생성 실패:", error);
      throw error;
    }

    return data;
  },

  // 사용자 프로필 조회
  async getUserProfile(userId: string) {
    const client = SupabaseSingleton.getInstance();
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("사용자 프로필 조회 실패:", error);
      throw error;
    }

    return data;
  },

  // 사용자 데이터 저장
  async saveUserData(userId: string, data: unknown) {
    const client = SupabaseSingleton.getInstance();
    const { data: result, error } = await client
      .from("user_data")
      .upsert({
        user_id: userId,
        data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("사용자 데이터 저장 실패:", error);
      throw error;
    }

    return result;
  },

  // 사용자 데이터 조회
  async getUserData(userId: string) {
    const client = SupabaseSingleton.getInstance();
    const { data, error } = await client
      .from("user_data")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("사용자 데이터 조회 실패:", error);
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
    const client = SupabaseSingleton.getInstance();
    const { data, error } = await client.from("user_activity_logs").insert({
      user_id: userId,
      activity_type: activityType,
      activity_data: activityData,
    });

    if (error) {
      console.error("활동 로그 기록 실패:", error);
      // 로그 기록 실패는 앱 동작에 영향을 주지 않도록 에러를 던지지 않음
    }

    return data;
  },
};

export default supabase;
