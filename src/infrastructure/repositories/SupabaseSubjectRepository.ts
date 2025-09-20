import { Subject } from "@/domain/entities/Subject";
import type { SubjectRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { getKSTTime } from "../../lib/timeUtils";

export class SupabaseSubjectRepository implements SubjectRepository {
  // Service Role Key를 사용한 Supabase 클라이언트 생성 (RLS 우회)
  private createServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase URL 또는 Service Role Key가 설정되지 않았습니다."
      );
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async getAll(userId: string): Promise<Subject[]> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      const { data, error } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 데이터가 없는 경우 빈 배열 반환
          return [];
        }
        logger.error("과목 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      const userData = data?.data as any;
      if (!userData?.subjects) {
        return [];
      }

      return userData.subjects
        .filter((subjectData: any) => {
          // UUID 형식 검증
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(subjectData.id);
        })
        .map((subjectData: any) =>
          Subject.restore(subjectData.id, subjectData.name, subjectData.color)
        );
    } catch (error) {
      logger.error("과목 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string): Promise<Subject | null> {
    try {
      const subjects = await this.getAll();
      return subjects.find((subject) => subject.id.value === id) || null;
    } catch (error) {
      logger.error("과목 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(subject: { name: string; color: string }, userId: string): Promise<Subject> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      const userData = (existingData?.data as any) || {};
      const subjects = userData.subjects || [];

      // 새 과목 생성
      const newSubjectEntity = Subject.create(subject.name, subject.color);
      const newSubject = {
        id: newSubjectEntity.id.value,
        name: newSubjectEntity.name,
        color: newSubjectEntity.color.value,
      };

      subjects.push(newSubject);

      // 데이터 업데이트
      const { error: updateError } = await serviceRoleClient
        .from("user_data")
        .upsert({
          user_id: userId,
          data: {
            ...userData,
            subjects,
            lastModified: getKSTTime(),
          },
        });

      if (updateError) {
        throw new Error(`과목 생성 실패: ${updateError.message}`);
      }

      return newSubjectEntity;
    } catch (error) {
      logger.error("과목 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(id: string, subject: { name: string; color: string }, userId?: string): Promise<Subject> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      // 현재 사용자 ID 가져오기 (localStorage에서)
      const userId =
        typeof window !== "undefined"
          ? localStorage.getItem("supabase_user_id") || "default-user-id"
          : "default-user-id";

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      const userData = existingData?.data as any;
      const subjects = userData.subjects || [];

      // 과목 업데이트
      const subjectIndex = subjects.findIndex((s: any) => s.id === id);
      if (subjectIndex === -1) {
        throw new Error("과목을 찾을 수 없습니다.");
      }

      subjects[subjectIndex] = {
        id: subject.id.value,
        name: subject.name,
        color: subject.color.value,
      };

      // 데이터 업데이트
      const { error: updateError } = await serviceRoleClient
        .from("user_data")
        .upsert({
          user_id: userId,
          data: {
            ...userData,
            subjects,
            lastModified: getKSTTime(),
          },
        });

      if (updateError) {
        throw new Error(`과목 수정 실패: ${updateError.message}`);
      }

      return subject;
    } catch (error) {
      logger.error("과목 수정 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      // 현재 사용자 ID 가져오기 (localStorage에서)
      const userId =
        typeof window !== "undefined"
          ? localStorage.getItem("supabase_user_id") || "default-user-id"
          : "default-user-id";

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      const userData = existingData?.data as any;
      const subjects = userData.subjects || [];

      // 과목 삭제
      const filteredSubjects = subjects.filter((s: any) => s.id !== id);

      // 데이터 업데이트
      const { error: updateError } = await serviceRoleClient
        .from("user_data")
        .upsert({
          user_id: userId,
          data: {
            ...userData,
            subjects: filteredSubjects,
            lastModified: getKSTTime(),
          },
        });

      if (updateError) {
        throw new Error(`과목 삭제 실패: ${updateError.message}`);
      }
    } catch (error) {
      logger.error("과목 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
