import { Student } from "@/domain/entities/Student";
import type { StudentRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { getKSTTime } from "../../lib/timeUtils";

export class SupabaseStudentRepository implements StudentRepository {
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

  async getAll(userId: string): Promise<Student[]> {
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
        logger.error("학생 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      const userData = data?.data as any;
      if (!userData?.students) {
        return [];
      }

      return userData.students.map((studentData: any) =>
        Student.restore(studentData.id, studentData.name)
      );
    } catch (error) {
      logger.error("학생 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string, userId?: string): Promise<Student | null> {
    try {
      const students = await this.getAll(userId || "default-user-id");
      return students.find((student) => student.id.value === id) || null;
    } catch (error) {
      logger.error("학생 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(data: { name: string }, userId: string): Promise<Student> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      const newStudent = Student.create(data.name);

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      let userData: any = {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
      };

      if (!fetchError && existingData?.data) {
        userData = existingData.data as any;
      }

      // 새 학생 추가
      userData.students.push({
        id: newStudent.id.value,
        name: newStudent.name,
      });

      // 데이터 저장
      const { error } = await serviceRoleClient.from("user_data").upsert({
        user_id: userId,
        data: userData,
        updated_at: getKSTTime(),
      });

      if (error) {
        logger.error("학생 생성 실패:", undefined, error as Error);
        throw error;
      }

      return newStudent;
    } catch (error) {
      logger.error("학생 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(id: string, data: { name?: string }): Promise<Student> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      // 현재 사용자 ID 가져오기 (localStorage에서)
      const userId =
        typeof window !== "undefined"
          ? localStorage.getItem("supabase_user_id")
          : null;

      if (!userId) {
        throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
      }

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingData?.data) {
        throw new Error("사용자 데이터를 찾을 수 없습니다.");
      }

      const userData = existingData.data as any;
      const studentIndex = userData.students.findIndex((s: any) => s.id === id);

      if (studentIndex === -1) {
        throw new Error("학생을 찾을 수 없습니다.");
      }

      // 학생 정보 업데이트
      if (data.name) userData.students[studentIndex].name = data.name;

      // 데이터 저장
      const { error } = await serviceRoleClient.from("user_data").upsert({
        user_id: userId,
        data: userData,
        updated_at: getKSTTime(),
      });

      if (error) {
        logger.error("학생 업데이트 실패:", undefined, error as Error);
        throw error;
      }

      return Student.restore(id, userData.students[studentIndex].name);
    } catch (error) {
      logger.error("학생 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string, userId?: string): Promise<void> {
    try {
      const serviceRoleClient = this.createServiceRoleClient();

      // userId가 제공되지 않으면 에러
      if (!userId) {
        throw new Error("사용자 ID가 필요합니다.");
      }

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await serviceRoleClient
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingData?.data) {
        throw new Error("사용자 데이터를 찾을 수 없습니다.");
      }

      const userData = existingData.data as any;

      // 학생 삭제
      userData.students = userData.students.filter((s: any) => s.id !== id);

      // 관련 세션과 수강신청도 삭제
      userData.sessions = userData.sessions.filter(
        (s: any) =>
          !s.enrollmentIds.some(
            (eId: string) =>
              userData.enrollments.find((e: any) => e.id === eId)?.studentId ===
              id
          )
      );

      userData.enrollments = userData.enrollments.filter(
        (e: any) => e.studentId !== id
      );

      // 데이터 저장
      const { error } = await serviceRoleClient.from("user_data").upsert({
        user_id: userId,
        data: userData,
        updated_at: getKSTTime(),
      });

      if (error) {
        logger.error("학생 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("학생 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
