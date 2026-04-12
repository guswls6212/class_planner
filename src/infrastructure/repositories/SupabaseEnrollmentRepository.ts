import type { EnrollmentRepository } from "@/infrastructure/interfaces";
import { Enrollment } from "@/shared/types/DomainTypes";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

export class SupabaseEnrollmentRepository implements EnrollmentRepository {
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

  private rowToEnrollment(row: any): Enrollment {
    return {
      id: row.id,
      studentId: row.student_id,
      subjectId: row.subject_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.created_at), // enrollments 테이블에 updated_at 없음
    };
  }

  async getAll(academyId: string): Promise<Enrollment[]> {
    try {
      const client = this.createServiceRoleClient();

      // enrollments는 직접 academy_id가 없으므로 students → academy_id로 조인
      const { data, error } = await client
        .from("enrollments")
        .select("*, students!inner(academy_id)")
        .eq("students.academy_id", academyId)
        .order("created_at");

      if (error) {
        logger.error("수강신청 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      return (data ?? []).map((row: any) => this.rowToEnrollment(row));
    } catch (error) {
      logger.error("수강신청 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string): Promise<Enrollment | null> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("enrollments")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.rowToEnrollment(data);
    } catch (error) {
      logger.error("수강신청 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(
    enrollmentData: Omit<Enrollment, "id" | "createdAt" | "updatedAt">,
    _academyId: string
  ): Promise<Enrollment> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("enrollments")
        .insert({
          student_id: enrollmentData.studentId,
          subject_id: enrollmentData.subjectId,
        })
        .select()
        .single();

      if (error) {
        logger.error("수강신청 생성 실패:", undefined, error as Error);
        throw error;
      }

      return this.rowToEnrollment(data);
    } catch (error) {
      logger.error("수강신청 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    enrollmentData: Partial<Omit<Enrollment, "id" | "createdAt" | "updatedAt">>
  ): Promise<Enrollment> {
    try {
      const client = this.createServiceRoleClient();

      const updates: Record<string, unknown> = {};
      if (enrollmentData.studentId !== undefined) updates.student_id = enrollmentData.studentId;
      if (enrollmentData.subjectId !== undefined) updates.subject_id = enrollmentData.subjectId;

      const { data, error } = await client
        .from("enrollments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("수강신청 업데이트 실패:", undefined, error as Error);
        throw error;
      }

      return this.rowToEnrollment(data);
    } catch (error) {
      logger.error("수강신청 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();

      const { error } = await client
        .from("enrollments")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("수강신청 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("수강신청 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
