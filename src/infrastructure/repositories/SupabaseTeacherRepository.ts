import { Teacher } from "@/domain/entities/Teacher";
import type { TeacherRole } from "@/domain/entities/Teacher";
import type { TeacherRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

export class SupabaseTeacherRepository implements TeacherRepository {
  private createServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase URL 또는 Service Role Key가 설정되지 않았습니다.");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  private rowToTeacher(row: Record<string, unknown>): Teacher {
    return Teacher.restore(
      row.id as string,
      row.name as string,
      (row.color as string) ?? "#6366f1",
      (row.user_id as string | null) ?? null,
      new Date(row.created_at as string),
      new Date(row.updated_at as string),
      {
        email: (row.email as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        role: (row.role as TeacherRole | null) ?? null,
        notes: (row.notes as string | null) ?? null,
      }
    );
  }

  async getAll(academyId: string): Promise<Teacher[]> {
    try {
      const client = this.createServiceRoleClient();
      const { data, error } = await client
        .from("teachers")
        .select("*")
        .eq("academy_id", academyId)
        .order("created_at");

      if (error) {
        logger.error("강사 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      return (data ?? []).map((row) => this.rowToTeacher(row));
    } catch (error) {
      logger.error("강사 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string, academyId?: string): Promise<Teacher | null> {
    try {
      const client = this.createServiceRoleClient();
      let query = client.from("teachers").select("*").eq("id", id);
      if (academyId) query = query.eq("academy_id", academyId);

      const { data, error } = await query.single();
      if (error || !data) return null;

      return this.rowToTeacher(data);
    } catch (error) {
      logger.error("강사 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(
    teacherData: { id?: string; name: string; color: string; userId?: string | null; email?: string | null; phone?: string | null; role?: TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const client = this.createServiceRoleClient();
      // Local-first: client UUID 그대로 upsert + idempotent (재시도 안전).
      const insertPayload: Record<string, unknown> = {
        academy_id: academyId,
        name: teacherData.name,
        color: teacherData.color,
        user_id: teacherData.userId ?? null,
        email: teacherData.email ?? null,
        phone: teacherData.phone ?? null,
        role: teacherData.role ?? null,
        notes: teacherData.notes ?? null,
      };
      if (teacherData.id) insertPayload.id = teacherData.id;

      const { data, error } = await client
        .from("teachers")
        .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        logger.error("강사 생성 실패:", undefined, error as Error);
        throw error;
      }

      return this.rowToTeacher(data);
    } catch (error) {
      logger.error("강사 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    teacherData: { name?: string; color?: string; userId?: string | null; email?: string | null; phone?: string | null; role?: TeacherRole | null; notes?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const client = this.createServiceRoleClient();
      const updatePayload: Record<string, unknown> = {};
      if (teacherData.name !== undefined) updatePayload.name = teacherData.name;
      if (teacherData.color !== undefined) updatePayload.color = teacherData.color;
      if ("userId" in teacherData) updatePayload.user_id = teacherData.userId ?? null;
      if ("email" in teacherData) updatePayload.email = teacherData.email ?? null;
      if ("phone" in teacherData) updatePayload.phone = teacherData.phone ?? null;
      if ("role" in teacherData) updatePayload.role = teacherData.role ?? null;
      if ("notes" in teacherData) updatePayload.notes = teacherData.notes ?? null;

      const { data, error } = await client
        .from("teachers")
        .update(updatePayload)
        .eq("id", id)
        .eq("academy_id", academyId)
        .select()
        .single();

      if (error) {
        logger.error("강사 업데이트 실패:", undefined, error as Error);
        throw error;
      }

      return this.rowToTeacher(data);
    } catch (error) {
      logger.error("강사 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string, academyId: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();
      const { error } = await client
        .from("teachers")
        .delete()
        .eq("id", id)
        .eq("academy_id", academyId);

      if (error) {
        logger.error("강사 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("강사 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async getSubjectIds(teacherId: string): Promise<string[]> {
    try {
      const client = this.createServiceRoleClient();
      const { data, error } = await client
        .from("teacher_subjects")
        .select("subject_id")
        .eq("teacher_id", teacherId);
      if (error || !data) return [];
      return data.map((r) => r.subject_id as string);
    } catch (error) {
      logger.error("강사-과목 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async addSubject(teacherId: string, subjectId: string, academyId: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();
      const { error } = await client.from("teacher_subjects").insert({
        teacher_id: teacherId,
        subject_id: subjectId,
        academy_id: academyId,
      });
      if (error && error.code !== "23505") {
        logger.error("강사-과목 추가 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("강사-과목 추가 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async removeSubject(teacherId: string, subjectId: string, academyId: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();
      const { error } = await client
        .from("teacher_subjects")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("subject_id", subjectId)
        .eq("academy_id", academyId);
      if (error) {
        logger.error("강사-과목 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("강사-과목 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
