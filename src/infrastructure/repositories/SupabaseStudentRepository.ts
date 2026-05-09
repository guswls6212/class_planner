import { Student } from "@/domain/entities/Student";
import type { StudentRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";
import {
  PAGINATION_DEFAULT_LIMIT,
  decodeCursor,
  encodeCursor,
  type PaginationOptions,
  type PaginationResult,
} from "../../lib/pagination";

export class SupabaseStudentRepository implements StudentRepository {
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

  private rowToStudent(row: Record<string, unknown>): Student {
    return Student.restore(row.id as string, row.name as string, {
      gender: (row.gender as string | null) ?? undefined,
      birthDate: (row.birth_date as string | null) ?? undefined,
      grade: (row.grade as string | null) ?? undefined,
      school: (row.school as string | null) ?? undefined,
      phone: (row.phone as string | null) ?? undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    });
  }

  async getAll(academyId: string): Promise<Student[]> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("students")
        .select("*")
        .eq("academy_id", academyId)
        .order("created_at");

      if (error) {
        logger.error("학생 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      return (data ?? []).map((row) => this.rowToStudent(row));
    } catch (error) {
      logger.error("학생 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getAllPaginated(
    academyId: string,
    options: PaginationOptions,
  ): Promise<PaginationResult<Student>> {
    try {
      const client = this.createServiceRoleClient();
      let query = client
        .from("students")
        .select("*")
        .eq("academy_id", academyId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (options.q) {
        query = query.ilike("name", `%${options.q}%`);
      }

      if (options.cursor) {
        const decoded = decodeCursor(options.cursor);
        if (decoded) {
          // (created_at, id) > (cursor.createdAt, cursor.id) — tie-break 안전
          query = query.or(
            `created_at.gt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.gt.${decoded.id})`,
          );
        }
      }

      const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
      query = query.limit(limit + 1); // +1로 hasMore 판정

      const { data, error } = await query;
      if (error) {
        logger.error("학생 페이징 조회 실패:", undefined, error as Error);
        return { items: [], nextCursor: null };
      }

      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const itemRows = hasMore ? rows.slice(0, limit) : rows;
      const items = itemRows.map((row) => this.rowToStudent(row));

      let nextCursor: string | null = null;
      if (hasMore && itemRows.length > 0) {
        const last = itemRows[itemRows.length - 1];
        nextCursor = encodeCursor({
          createdAt: last.created_at as string,
          id: last.id as string,
        });
      }

      return { items, nextCursor };
    } catch (error) {
      logger.error("학생 페이징 조회 중 오류:", undefined, error as Error);
      return { items: [], nextCursor: null };
    }
  }

  async getById(id: string, academyId?: string): Promise<Student | null> {
    try {
      const client = this.createServiceRoleClient();

      let query = client.from("students").select("*").eq("id", id);
      if (academyId) {
        query = query.eq("academy_id", academyId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return Student.restore(data.id, data.name, {
        gender: data.gender ?? undefined,
        birthDate: data.birth_date ?? undefined,
        grade: data.grade ?? undefined,
        school: data.school ?? undefined,
        phone: data.phone ?? undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      });
    } catch (error) {
      logger.error("학생 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(
    studentData: { id?: string; name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
    academyId: string
  ): Promise<Student> {
    try {
      const client = this.createServiceRoleClient();

      // Local-first: client UUID 그대로 upsert + idempotent (재시도 안전).
      // id 충돌 시 onConflict:"id" → 같은 row 그대로 반환 (의미적 get-or-create).
      const insertPayload: Record<string, unknown> = {
        academy_id: academyId,
        name: studentData.name,
        gender: studentData.gender ?? null,
        birth_date: studentData.birthDate ?? null,
        grade: studentData.grade ?? null,
        school: studentData.school ?? null,
        phone: studentData.phone ?? null,
      };
      if (studentData.id) insertPayload.id = studentData.id;

      const { data, error } = await client
        .from("students")
        .upsert(insertPayload, { onConflict: "id", ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        logger.error("학생 생성 실패:", undefined, error as Error);
        throw error;
      }

      return Student.restore(data.id, data.name, {
        gender: data.gender ?? undefined,
        birthDate: data.birth_date ?? undefined,
        grade: data.grade ?? undefined,
        school: data.school ?? undefined,
        phone: data.phone ?? undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      });
    } catch (error) {
      logger.error("학생 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    studentData: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
    academyId: string
  ): Promise<Student> {
    try {
      const client = this.createServiceRoleClient();

      const updates: Record<string, unknown> = {};
      if (studentData.name !== undefined) updates.name = studentData.name;
      if (studentData.gender !== undefined) updates.gender = studentData.gender;
      if (studentData.birthDate !== undefined) updates.birth_date = studentData.birthDate;
      if (studentData.grade !== undefined) updates.grade = studentData.grade;
      if (studentData.school !== undefined) updates.school = studentData.school;
      if (studentData.phone !== undefined) updates.phone = studentData.phone;

      const { data, error } = await client
        .from("students")
        .update(updates)
        .eq("id", id)
        .eq("academy_id", academyId)
        .select()
        .single();

      if (error) {
        logger.error("학생 업데이트 실패:", undefined, error as Error);
        throw error;
      }

      return Student.restore(data.id, data.name, {
        gender: data.gender ?? undefined,
        birthDate: data.birth_date ?? undefined,
        grade: data.grade ?? undefined,
        school: data.school ?? undefined,
        phone: data.phone ?? undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      });
    } catch (error) {
      logger.error("학생 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string, academyId: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();

      const { error } = await client
        .from("students")
        .delete()
        .eq("id", id)
        .eq("academy_id", academyId);

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
