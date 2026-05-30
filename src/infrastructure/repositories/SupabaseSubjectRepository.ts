import { Subject } from "@/domain/entities/Subject";
import type { SubjectRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import { mapRowsSafely } from "./_helpers/mapRowsSafely";

export class SupabaseSubjectRepository implements SubjectRepository {
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

  async getAll(academyId: string): Promise<Subject[]> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("subjects")
        .select("*")
        .eq("academy_id", academyId)
        .order("created_at");

      if (error) {
        logger.error("과목 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      return mapRowsSafely(
        (data ?? []) as Array<Record<string, unknown>>,
        (row) =>
          Subject.restore(
            row.id as string,
            row.name as string,
            (row.color as string | null) ?? "#000000",
            new Date(row.created_at as string),
            new Date(row.updated_at as string)
          ),
        { entity: "과목", idField: "id" }
      );
    } catch (error) {
      logger.error("과목 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string, academyId?: string): Promise<Subject | null> {
    try {
      const client = this.createServiceRoleClient();

      let query = client.from("subjects").select("*").eq("id", id);
      if (academyId) {
        query = query.eq("academy_id", academyId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return Subject.restore(data.id, data.name, data.color ?? "#000000",
        new Date(data.created_at), new Date(data.updated_at));
    } catch (error) {
      logger.error("과목 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(
    subjectData: { id?: string; name: string; color: string },
    academyId: string
  ): Promise<Subject> {
    try {
      const client = this.createServiceRoleClient();

      // Local-first: client UUID 그대로 upsert + idempotent (재시도 안전).
      const insertPayload: Record<string, unknown> = {
        academy_id: academyId,
        name: subjectData.name,
        color: subjectData.color,
      };
      if (subjectData.id) insertPayload.id = subjectData.id;

      const { data, error } = await client
        .from("subjects")
        .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        logger.error("과목 생성 실패:", undefined, error as Error);
        throw error;
      }

      return Subject.restore(data.id, data.name, data.color ?? "#000000",
        new Date(data.created_at), new Date(data.updated_at));
    } catch (error) {
      logger.error("과목 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    subjectData: { name: string; color: string },
    academyId: string
  ): Promise<Subject> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("subjects")
        .update({ name: subjectData.name, color: subjectData.color })
        .eq("id", id)
        .eq("academy_id", academyId)
        .select()
        .single();

      if (error) {
        logger.error("과목 업데이트 실패:", undefined, error as Error);
        throw error;
      }

      return Subject.restore(data.id, data.name, data.color ?? "#000000",
        new Date(data.created_at), new Date(data.updated_at));
    } catch (error) {
      logger.error("과목 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string, academyId: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();

      const { error } = await client
        .from("subjects")
        .delete()
        .eq("id", id)
        .eq("academy_id", academyId);

      if (error) {
        logger.error("과목 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("과목 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
