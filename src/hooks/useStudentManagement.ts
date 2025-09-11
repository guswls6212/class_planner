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
        // 로그인된 사용자: user_data JSONB에서 로드
        const { data, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Supabase 학생 로드 실패:", error);
          return [];
        }

        const userData = data?.data || {};
        return (userData.students || []).map((student: any) => ({
          id: student.id,
          name: student.name,
        }));
      } else {
        // 로그인 안된 사용자: 빈 배열 반환
        return [];
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
          // 로그인된 사용자: user_data JSONB에 저장
          const { data: existingData, error: fetchError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", user.id)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("기존 데이터 조회 실패:", fetchError);
            setStudents(students);
            setErrorMessage("학생 추가에 실패했습니다.");
            return false;
          }

          const userData = existingData?.data || {};
          const updatedStudents = [...(userData.students || []), student];

          let error;
          if (existingData) {
            // 기존 데이터가 있으면 UPDATE
            const { error: updateError } = await supabase
              .from("user_data")
              .update({
                data: {
                  ...userData,
                  students: updatedStudents,
                },
              })
              .eq("user_id", user.id);
            error = updateError;
          } else {
            // 기존 데이터가 없으면 INSERT
            const { error: insertError } = await supabase
              .from("user_data")
              .insert({
                user_id: user.id,
                data: {
                  ...userData,
                  students: updatedStudents,
                },
              });
            error = insertError;
          }

          if (error) {
            console.error("Supabase 학생 추가 실패:", error);
            // 롤백
            setStudents(students);
            setErrorMessage("학생 추가에 실패했습니다.");
            return false;
          }
        } else {
          // 로그인 안된 사용자: 로컬 상태만 업데이트 (저장 안함)
          console.log("로그인하지 않은 사용자 - 로컬 상태만 업데이트");
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
          // 로그인된 사용자: user_data JSONB에서 삭제
          const { data: existingData, error: fetchError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", user.id)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("기존 데이터 조회 실패:", fetchError);
            setStudents(students);
            return false;
          }

          const userData = existingData?.data || {};
          const updatedStudents = (userData.students || []).filter(
            (s: any) => s.id !== studentId
          );

          let error;
          if (existingData) {
            // 기존 데이터가 있으면 UPDATE
            const { error: updateError } = await supabase
              .from("user_data")
              .update({
                data: {
                  ...userData,
                  students: updatedStudents,
                },
              })
              .eq("user_id", user.id);
            error = updateError;
          } else {
            // 기존 데이터가 없으면 INSERT (빈 학생 목록)
            const { error: insertError } = await supabase
              .from("user_data")
              .insert({
                user_id: user.id,
                data: {
                  ...userData,
                  students: updatedStudents,
                },
              });
            error = insertError;
          }

          if (error) {
            console.error("Supabase 학생 삭제 실패:", error);
            // 롤백
            setStudents(students);
            return false;
          }
        } else {
          // 로그인 안된 사용자: 로컬 상태만 업데이트 (저장 안함)
          console.log("로그인하지 않은 사용자 - 로컬 상태만 업데이트");
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
