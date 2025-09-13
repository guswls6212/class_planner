/**
 * Data Application Service
 *
 * JSONB 기반 통합 데이터 관리를 위한 애플리케이션 서비스
 */

import { supabase } from "../../utils/supabaseClient";

export interface UserData {
  students: any[];
  subjects: any[];
  sessions: any[];
  enrollments: any[];
  version: string;
  lastModified: string;
}

export class DataApplicationServiceImpl {
  constructor() {}

  /**
   * 사용자의 전체 데이터를 JSONB에서 가져오기
   */
  async getAllUserData(userId: string): Promise<UserData | null> {
    try {
      console.log("🔍 DataApplicationService - 사용자 ID:", userId);

      // Supabase에서 사용자 데이터 조회
      console.log("🔍 Supabase 쿼리 시작 - user_id:", userId);

      // 현재 인증 상태 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      console.log("🔍 현재 인증된 사용자:", user?.id, "에러:", authError);

      const { data, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      console.log("🔍 Supabase 쿼리 결과 - data:", data, "error:", error);

      if (error) {
        console.error("Supabase 데이터 조회 실패:", error);
        // 데이터가 없는 경우 빈 데이터 반환
        if (error.code === "PGRST116") {
          console.log("🔍 사용자 데이터가 없음, 빈 데이터 반환");
          return {
            students: [],
            subjects: [],
            sessions: [],
            enrollments: [],
            version: "1.0",
            lastModified: new Date().toISOString(),
          };
        }
        throw error;
      }

      console.log("🔍 Supabase에서 조회된 데이터:", data);

      // JSONB 데이터 파싱
      const userData = data?.data || {};

      return {
        students: userData.students || [],
        subjects: userData.subjects || [],
        sessions: userData.sessions || [],
        enrollments: userData.enrollments || [],
        version: userData.version || "1.0",
        lastModified: userData.lastModified || new Date().toISOString(),
      };
    } catch (error) {
      console.error("전체 사용자 데이터 조회 실패:", error);
      throw error;
    }
  }

  /**
   * 사용자의 전체 데이터를 JSONB로 업데이트
   */
  async updateAllUserData(userId: string, data: UserData): Promise<UserData> {
    try {
      console.log("🔍 DataApplicationService - 데이터 업데이트:", userId, data);

      // Supabase에 데이터 저장/업데이트
      const { data: result, error } = await supabase
        .from("user_data")
        .upsert({
          user_id: userId,
          data: data,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase 데이터 저장 실패:", error);
        throw error;
      }

      console.log("🔍 Supabase에 저장 완료:", result);
      return data;
    } catch (error) {
      console.error("전체 사용자 데이터 업데이트 실패:", error);
      throw error;
    }
  }
}
