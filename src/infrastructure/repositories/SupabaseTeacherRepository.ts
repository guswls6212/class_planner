import { Teacher } from "@/domain/entities/Teacher";
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
      new Date(row.updated_at as string)
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
    teacherData: { name: string; color: string; userId?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const client = this.createServiceRoleClient();
      const { data, error } = await client
        .from("teachers")
        .insert({
          academy_id: academyId,
          name: teacherData.name,
          color: teacherData.color,
          user_id: teacherData.userId ?? null,
        })
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
    teacherData: { name?: string; color?: string; userId?: string | null },
    academyId: string
  ): Promise<Teacher> {
    try {
      const client = this.createServiceRoleClient();
      const updatePayload: Record<string, unknown> = {};
      if (teacherData.name !== undefined) updatePayload.name = teacherData.name;
      if (teacherData.color !== undefined) updatePayload.color = teacherData.color;
      if ("userId" in teacherData) updatePayload.user_id = teacherData.userId ?? null;

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
}
