import { Student } from "@/domain/entities/Student";
import type { StudentRepository } from "@/infrastructure/interfaces";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

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

      return (data ?? []).map((row) =>
        Student.restore(row.id, row.name, {
          gender: row.gender ?? undefined,
          birthDate: row.birth_date ?? undefined,
          grade: row.grade ?? undefined,
          school: row.school ?? undefined,
          phone: row.phone ?? undefined,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })
      );
    } catch (error) {
      logger.error("학생 데이터 조회 중 오류:", undefined, error as Error);
      return [];
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
    studentData: { name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string },
    academyId: string
  ): Promise<Student> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("students")
        .insert({
          academy_id: academyId,
          name: studentData.name,
          gender: studentData.gender ?? null,
          birth_date: studentData.birthDate ?? null,
          grade: studentData.grade ?? null,
          school: studentData.school ?? null,
          phone: studentData.phone ?? null,
        })
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
