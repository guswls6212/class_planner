/**
 * 🎣 Custom Hook - useSubjectManagement (Clean Architecture)
 *
 * 새로운 Clean Architecture 구조를 사용하는 과목 관리 훅입니다.
 * 애플리케이션 서비스와 도메인 엔티티를 활용합니다.
 */

import { repositoryFactory } from "@/infrastructure";
import type { SubjectDto } from "@/shared/types/ApplicationTypes";
import { useCallback, useEffect, useState } from "react";

// ===== 과목 애플리케이션 서비스 (임시 구현) =====

class SubjectApplicationService {
  private subjectRepository: any;

  constructor() {
    this.subjectRepository = repositoryFactory.createSubjectRepository();
  }

  async getAllSubjects(options?: { sortBy?: string; sortOrder?: string }) {
    try {
      const subjects = await this.subjectRepository.findAll();

      // 정렬
      let sortedSubjects = subjects;
      if (options?.sortBy) {
        switch (options.sortBy) {
          case "name":
            sortedSubjects = subjects.sort((a: any, b: any) =>
              a.name.localeCompare(b.name)
            );
            break;
          case "createdAt":
            sortedSubjects = subjects.sort(
              (a: any, b: any) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
            break;
        }

        if (options.sortOrder === "desc") {
          sortedSubjects = sortedSubjects.reverse();
        }
      }

      return {
        success: true,
        subjects: sortedSubjects.map((subject: any) => subject.toDto()),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  async addSubject(request: { name: string; color: string }) {
    try {
      const { Subject } = await import("@entities/Subject");
      const newSubject = Subject.create(request.name, request.color);
      const savedSubject = await this.subjectRepository.save(newSubject);

      return {
        success: true,
        subject: savedSubject.toDto(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  async updateSubject(request: { id: string; name?: string; color?: string }) {
    try {
      const { SubjectId } = await import("@value-objects/SubjectId");
      const { Subject } = await import("@entities/Subject");

      const subjectId = SubjectId.fromString(request.id);
      const existingSubject = await this.subjectRepository.findById(subjectId);

      if (!existingSubject) {
        return {
          success: false,
          error: "과목을 찾을 수 없습니다.",
        };
      }

      let updatedSubject = existingSubject;

      if (request.name) {
        updatedSubject = updatedSubject.changeName(request.name);
      }

      if (request.color) {
        updatedSubject = updatedSubject.changeColor(request.color);
      }

      const savedSubject = await this.subjectRepository.save(updatedSubject);

      return {
        success: true,
        subject: savedSubject.toDto(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  async deleteSubject(request: { id: string }) {
    try {
      const { SubjectId } = await import("@value-objects/SubjectId");

      const subjectId = SubjectId.fromString(request.id);
      await this.subjectRepository.delete(subjectId);

      return {
        success: true,
        deletedSubjectId: request.id,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }

  async getSubject(request: { id: string }) {
    try {
      const { SubjectId } = await import("@value-objects/SubjectId");

      const subjectId = SubjectId.fromString(request.id);
      const subject = await this.subjectRepository.findById(subjectId);

      if (!subject) {
        return {
          success: false,
          error: "과목을 찾을 수 없습니다.",
        };
      }

      return {
        success: true,
        subject: subject.toDto(),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      };
    }
  }
}

// ===== 훅 인터페이스 =====

export interface UseSubjectManagementReturn {
  // 상태
  subjects: SubjectDto[];
  loading: boolean;
  error: string | null;

  // 액션
  addSubject: (name: string, color: string) => Promise<boolean>;
  updateSubject: (
    id: string,
    updates: { name?: string; color?: string }
  ) => Promise<boolean>;
  deleteSubject: (id: string) => Promise<boolean>;
  getSubject: (id: string) => Promise<SubjectDto | null>;

  // 유틸리티
  refreshSubjects: () => Promise<void>;
  clearError: () => void;

  // 통계
  subjectCount: number;
}

// ===== 훅 구현 =====

export const useSubjectManagementClean = (): UseSubjectManagementReturn => {
  // 상태
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 애플리케이션 서비스 인스턴스 (싱글톤)
  const [subjectService] = useState(() => new SubjectApplicationService());

  // ===== 과목 목록 조회 =====

  const refreshSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await subjectService.getAllSubjects({
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (result.success && result.subjects) {
        setSubjects(result.subjects);
      } else {
        setError(result.error || "과목 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [subjectService]);

  // ===== 과목 추가 =====

  const addSubject = useCallback(
    async (name: string, color: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await subjectService.addSubject({ name, color });

        if (result.success && result.subject) {
          // 성공 시 목록 새로고침
          await refreshSubjects();
          return true;
        } else {
          setError(result.error || "과목 추가에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [subjectService, refreshSubjects]
  );

  // ===== 과목 수정 =====

  const updateSubject = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: string }
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await subjectService.updateSubject({ id, ...updates });

        if (result.success && result.subject) {
          // 성공 시 목록 새로고침
          await refreshSubjects();
          return true;
        } else {
          setError(result.error || "과목 수정에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [subjectService, refreshSubjects]
  );

  // ===== 과목 삭제 =====

  const deleteSubject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await subjectService.deleteSubject({ id });

        if (result.success) {
          // 성공 시 목록 새로고침
          await refreshSubjects();
          return true;
        } else {
          setError(result.error || "과목 삭제에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [subjectService, refreshSubjects]
  );

  // ===== 과목 조회 =====

  const getSubject = useCallback(
    async (id: string): Promise<SubjectDto | null> => {
      try {
        const result = await subjectService.getSubject({ id });

        if (result.success && result.subject) {
          return result.subject;
        } else {
          setError(result.error || "과목 조회에 실패했습니다.");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return null;
      }
    },
    [subjectService]
  );

  // ===== 에러 클리어 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshSubjects();
  }, [refreshSubjects]);

  // ===== 반환값 =====

  return {
    // 상태
    subjects,
    loading,
    error,

    // 액션
    addSubject,
    updateSubject,
    deleteSubject,
    getSubject,

    // 유틸리티
    refreshSubjects,
    clearError,

    // 통계
    subjectCount: subjects.length,
  };
};
