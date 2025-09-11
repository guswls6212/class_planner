import { Subject } from "@/domain/entities/Subject";
import type { SubjectRepository } from "@/infrastructure/interfaces";
import { supabase } from "@/utils/supabaseClient";

export class SupabaseSubjectRepository implements SubjectRepository {
  async getAll(): Promise<Subject[]> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        // 로그인되지 않은 경우 빈 배열 반환
        return [];
      }

      const { data, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 데이터가 없는 경우 빈 배열 반환
          return [];
        }
        console.error("과목 데이터 조회 실패:", error);
        return [];
      }

      const userData = data?.data as any;
      if (!userData?.subjects) {
        return [];
      }

      return userData.subjects.map((subjectData: any) =>
        Subject.restore(subjectData.id, subjectData.name, subjectData.color)
      );
    } catch (error) {
      console.error("과목 데이터 조회 중 오류:", error);
      return [];
    }
  }

  async getById(id: string): Promise<Subject | null> {
    try {
      const subjects = await this.getAll();
      return subjects.find((subject) => subject.id.value === id) || null;
    } catch (error) {
      console.error("과목 조회 중 오류:", error);
      return null;
    }
  }

  async create(subject: Subject): Promise<Subject> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      const userData = (existingData?.data as any) || {};
      const subjects = userData.subjects || [];

      // 새 과목 추가
      const newSubject = {
        id: subject.id.value,
        name: subject.name,
        color: subject.color.value,
      };

      subjects.push(newSubject);

      // 데이터 업데이트
      const { error: updateError } = await supabase.from("user_data").upsert({
        user_id: sessionData.session.user.id,
        data: {
          ...userData,
          subjects,
          lastModified: new Date().toISOString(),
        },
      });

      if (updateError) {
        throw new Error(`과목 생성 실패: ${updateError.message}`);
      }

      return subject;
    } catch (error) {
      console.error("과목 생성 중 오류:", error);
      throw error;
    }
  }

  async update(id: string, subject: Subject): Promise<Subject> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", sessionData.session.user.id)
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
      const { error: updateError } = await supabase.from("user_data").upsert({
        user_id: sessionData.session.user.id,
        data: {
          ...userData,
          subjects,
          lastModified: new Date().toISOString(),
        },
      });

      if (updateError) {
        throw new Error(`과목 수정 실패: ${updateError.message}`);
      }

      return subject;
    } catch (error) {
      console.error("과목 수정 중 오류:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 기존 데이터 조회
      const { data: existingData, error: fetchError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (fetchError) {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      const userData = existingData?.data as any;
      const subjects = userData.subjects || [];

      // 과목 삭제
      const filteredSubjects = subjects.filter((s: any) => s.id !== id);

      // 데이터 업데이트
      const { error: updateError } = await supabase.from("user_data").upsert({
        user_id: sessionData.session.user.id,
        data: {
          ...userData,
          subjects: filteredSubjects,
          lastModified: new Date().toISOString(),
        },
      });

      if (updateError) {
        throw new Error(`과목 삭제 실패: ${updateError.message}`);
      }
    } catch (error) {
      console.error("과목 삭제 중 오류:", error);
      throw error;
    }
  }
}
