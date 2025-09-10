import { useCallback, useState } from "react";
import type { Student } from "../lib/planner";
import { uid } from "../lib/planner";
import type {
  AddStudentFormData,
  StudentActions,
} from "../types/studentsTypes";
import { supabase } from "../utils/supabaseClient";
import { useFeatureGuard } from "./useFeatureGuard";

export const useStudentManagement = (
  students: Student[],
  setStudents: (students: Student[]) => void,
  setNewStudentName: (name: string) => void
): StudentActions & {
  formData: AddStudentFormData;
  errorMessage: string;
  showUpgradeModal: () => void;
} => {
  const [formData, setFormData] = useState<AddStudentFormData>({
    name: "",
    isValid: false,
  });
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { showUpgradeModal } = useFeatureGuard();

  // 학생 데이터 로드 (로그인 상태에 따라 분기)
  const loadStudents = useCallback(async (): Promise<Student[]> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 로그인된 사용자: Supabase에서 로드
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Supabase 학생 로드 실패:", error);
          return [];
        }

        return (data || []).map((student) => ({
          id: student.id,
          name: student.name,
        }));
      } else {
        // 로그인 안된 사용자: localStorage에서 로드
        const localStudents = localStorage.getItem("students");
        return localStudents ? JSON.parse(localStudents) : [];
      }
    } catch (error) {
      console.error("학생 로드 중 오류:", error);
      return [];
    }
  }, []);

  const validateStudentName = (name: string): AddStudentFormData => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: "학생 이름을 입력해주세요.",
      };
    }

    if (students.some((s) => s.name === trimmedName)) {
      return {
        name: trimmedName,
        isValid: false,
        errorMessage: "이미 존재하는 학생 이름입니다.",
      };
    }

    return {
      name: trimmedName,
      isValid: true,
    };
  };

  const addStudent = useCallback(
    async (name: string): Promise<boolean> => {
      const validation = validateStudentName(name);

      if (!validation.isValid) {
        setErrorMessage(validation.errorMessage || "");
        return false;
      }

      const student: Student = { id: uid(), name: validation.name };
      const newStudents = [...students, student];
      setStudents(newStudents);
      setNewStudentName("");
      setFormData({ name: "", isValid: false });
      setErrorMessage(""); // 성공 시 에러 메시지 초기화

      try {
        // 로그인 상태 확인
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: Supabase에 저장
          const { error } = await supabase.from("students").insert({
            user_id: user.id,
            name: student.name,
            created_at: new Date().toISOString(),
          });

          if (error) {
            console.error("Supabase 학생 추가 실패:", error);
            // 롤백
            setStudents(students);
            setErrorMessage("학생 추가에 실패했습니다.");
            return false;
          }
        } else {
          // 로그인 안된 사용자: localStorage에 저장
          localStorage.setItem("students", JSON.stringify(newStudents));
        }

        return true;
      } catch (error) {
        console.error("학생 추가 중 오류:", error);
        // 롤백
        setStudents(students);
        setErrorMessage("학생 추가에 실패했습니다.");
        return false;
      }
    },
    [students, setStudents, setNewStudentName]
  );

  const deleteStudent = useCallback(
    async (studentId: string): Promise<boolean> => {
      const newStudents = students.filter((x) => x.id !== studentId);
      setStudents(newStudents);

      try {
        // 로그인 상태 확인
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: Supabase에서 삭제
          const { error } = await supabase
            .from("students")
            .delete()
            .eq("user_id", user.id)
            .eq("id", studentId);

          if (error) {
            console.error("Supabase 학생 삭제 실패:", error);
            // 롤백
            setStudents(students);
            return false;
          }
        } else {
          // 로그인 안된 사용자: localStorage에서 삭제
          localStorage.setItem("students", JSON.stringify(newStudents));
        }

        return true;
      } catch (error) {
        console.error("학생 삭제 중 오류:", error);
        // 롤백
        setStudents(students);
        return false;
      }
    },
    [students, setStudents]
  );

  const selectStudent = (studentId: string): string => {
    // 선택된 학생이 이미 선택된 상태라면 선택 해제
    const newSelectedId = students.find((s) => s.id === studentId)
      ? studentId
      : "";
    return newSelectedId;
  };

  const updateStudentName = (name: string) => {
    const validation = validateStudentName(name);
    setFormData(validation);
  };

  const handleShowUpgradeModal = () => {
    showUpgradeModal("addStudent", students.length, 10);
  };

  return {
    addStudent,
    deleteStudent,
    selectStudent,
    updateStudentName,
    loadStudents,
    formData,
    errorMessage,
    showUpgradeModal: handleShowUpgradeModal,
  };
};
