import type { SessionRepository } from "@/infrastructure/interfaces";
import { Session } from "@/shared/types/DomainTypes";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../lib/logger";

export class SupabaseSessionRepository implements SessionRepository {
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

  // TIME "HH:MM:SS" → "HH:MM"
  private toTimeString(t: string): string {
    return t ? t.slice(0, 5) : "";
  }

  private rowToSession(row: any): Session {
    const sessionEnrollments: Array<{ enrollment_id: string; enrollments?: { subject_id: string } }> =
      row.session_enrollments ?? [];
    const enrollmentIds = sessionEnrollments.map((se) => se.enrollment_id);
    const subjectId = sessionEnrollments[0]?.enrollments?.subject_id ?? "";

    return {
      id: row.id,
      subjectId,
      enrollmentIds,
      weekday: row.weekday,
      startsAt: this.toTimeString(row.starts_at),
      endsAt: this.toTimeString(row.ends_at),
      weekStartDate: row.week_start_date ?? "",
      room: row.room ?? "",
      yPosition: row.y_position ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getAll(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]> {
    try {
      const client = this.createServiceRoleClient();

      let q = client
        .from("sessions")
        .select(`
          *,
          session_enrollments(
            enrollment_id,
            enrollments(subject_id)
          )
        `)
        .eq("academy_id", academyId);

      if (opts?.weekStartDate) {
        q = q.eq("week_start_date", opts.weekStartDate);
      }

      const { data, error } = await q.order("created_at");

      if (error) {
        logger.error("세션 데이터 조회 실패:", undefined, error as Error);
        return [];
      }

      return (data ?? []).map((row: any) => this.rowToSession(row));
    } catch (error) {
      logger.error("세션 데이터 조회 중 오류:", undefined, error as Error);
      return [];
    }
  }

  async getById(id: string): Promise<Session | null> {
    try {
      const client = this.createServiceRoleClient();

      const { data, error } = await client
        .from("sessions")
        .select(`
          *,
          session_enrollments(
            enrollment_id,
            enrollments(subject_id)
          )
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.rowToSession(data);
    } catch (error) {
      logger.error("세션 조회 중 오류:", undefined, error as Error);
      return null;
    }
  }

  async create(
    sessionData: Omit<Session, "id" | "createdAt" | "updatedAt">,
    academyId: string
  ): Promise<Session> {
    try {
      const client = this.createServiceRoleClient();

      // 1. sessions 테이블에 INSERT
      const { data, error } = await client
        .from("sessions")
        .insert({
          academy_id: academyId,
          weekday: sessionData.weekday,
          starts_at: sessionData.startsAt,
          ends_at: sessionData.endsAt,
          week_start_date: sessionData.weekStartDate || "",
          room: sessionData.room ?? "",
          y_position: sessionData.yPosition ?? 1,
        })
        .select()
        .single();

      if (error) {
        logger.error("세션 생성 실패:", undefined, error as Error);
        throw error;
      }

      // 2. session_enrollments에 enrollmentIds 연결
      if (sessionData.enrollmentIds && sessionData.enrollmentIds.length > 0) {
        const sessionEnrollmentRows = sessionData.enrollmentIds.map((enrollmentId) => ({
          session_id: data.id,
          enrollment_id: enrollmentId,
        }));

        const { error: seError } = await client
          .from("session_enrollments")
          .insert(sessionEnrollmentRows);

        if (seError) {
          logger.error("session_enrollments 생성 실패:", undefined, seError as Error);
          throw seError;
        }
      }

      // 3. 생성된 세션을 완전한 형태로 반환
      const created = await this.getById(data.id);
      if (!created) throw new Error("생성된 세션을 조회할 수 없습니다.");
      return created;
    } catch (error) {
      logger.error("세션 생성 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    sessionData: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>
  ): Promise<Session> {
    try {
      const client = this.createServiceRoleClient();

      const updates: Record<string, unknown> = {};
      if (sessionData.weekday !== undefined) updates.weekday = sessionData.weekday;
      if (sessionData.startsAt !== undefined) updates.starts_at = sessionData.startsAt;
      if (sessionData.endsAt !== undefined) updates.ends_at = sessionData.endsAt;
      if (sessionData.room !== undefined) updates.room = sessionData.room;
      if (sessionData.yPosition !== undefined) updates.y_position = sessionData.yPosition;

      if (Object.keys(updates).length > 0) {
        const { error } = await client
          .from("sessions")
          .update(updates)
          .eq("id", id);

        if (error) {
          logger.error("세션 업데이트 실패:", undefined, error as Error);
          throw error;
        }
      }

      // enrollmentIds 업데이트
      if (sessionData.enrollmentIds !== undefined) {
        // 기존 연결 삭제
        const { error: deleteError } = await client
          .from("session_enrollments")
          .delete()
          .eq("session_id", id);

        if (deleteError) {
          logger.error("session_enrollments 삭제 실패:", undefined, deleteError as Error);
          throw deleteError;
        }

        // 새 연결 삽입
        if (sessionData.enrollmentIds.length > 0) {
          const rows = sessionData.enrollmentIds.map((enrollmentId) => ({
            session_id: id,
            enrollment_id: enrollmentId,
          }));

          const { error: insertError } = await client
            .from("session_enrollments")
            .insert(rows);

          if (insertError) {
            logger.error("session_enrollments 재생성 실패:", undefined, insertError as Error);
            throw insertError;
          }
        }
      }

      const updated = await this.getById(id);
      if (!updated) throw new Error("업데이트된 세션을 조회할 수 없습니다.");
      return updated;
    } catch (error) {
      logger.error("세션 업데이트 중 오류:", undefined, error as Error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const client = this.createServiceRoleClient();

      // session_enrollments는 ON DELETE CASCADE로 자동 삭제됨
      const { error } = await client
        .from("sessions")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("세션 삭제 실패:", undefined, error as Error);
        throw error;
      }
    } catch (error) {
      logger.error("세션 삭제 중 오류:", undefined, error as Error);
      throw error;
    }
  }
}
