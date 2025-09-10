import { useCallback, useEffect, useState } from "react";
import { uid } from "uid";
import type { Subject } from "../types/subjectsTypes";
import { supabase } from "../utils/supabaseClient";

const SUBJECTS_KEY = "subjects";

// 기본 과목 목록 (고정 ID 사용)
const DEFAULT_SUBJECTS: Subject[] = [
  { id: "default-1", name: "초등수학", color: "#fbbf24" }, // 밝은 노란색
  { id: "default-2", name: "중등수학", color: "#f59e0b" }, // 주황색
  { id: "default-3", name: "중등영어", color: "#3b82f6" }, // 파란색
  { id: "default-4", name: "중등국어", color: "#10b981" }, // 초록색
  { id: "default-5", name: "중등과학", color: "#ec4899" }, // 분홍색
  { id: "default-6", name: "중등사회", color: "#06b6d4" }, // 청록색
  { id: "default-7", name: "고등수학", color: "#ef4444" }, // 빨간색
  { id: "default-8", name: "고등영어", color: "#8b5cf6" }, // 보라색
  { id: "default-9", name: "고등국어", color: "#059669" }, // 진한 초록색
];

export const useGlobalSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 과목 목록 불러오기 (로그인 상태에 따라 분기)
  const loadSubjects = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 로그인된 사용자: Supabase에서 로드
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Supabase 과목 로드 실패:", error);
          setSubjects(DEFAULT_SUBJECTS);
          return;
        }

        const subjects = (data || []).map((subject) => ({
          id: subject.id,
          name: subject.name,
          color: subject.color,
        }));

        if (subjects.length === 0) {
          // 기본 과목이 없으면 생성
          await createDefaultSubjects(user.id);
          setSubjects(DEFAULT_SUBJECTS);
        } else {
          setSubjects(subjects);
        }
      } else {
        // 로그인 안된 사용자: localStorage에서 로드
        const savedSubjects = localStorage.getItem(SUBJECTS_KEY);

        if (savedSubjects) {
          const parsedSubjects = JSON.parse(savedSubjects) as Subject[];
          setSubjects(parsedSubjects);
        } else {
          setSubjects(DEFAULT_SUBJECTS);
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
        }
      }
    } catch (error) {
      console.error("❌ 과목 목록 로드 중 오류 발생:", error);
      setSubjects(DEFAULT_SUBJECTS);
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(DEFAULT_SUBJECTS));
    }
  }, []);

  // 기본 과목들을 Supabase에 생성
  const createDefaultSubjects = useCallback(async (userId: string) => {
    try {
      const subjectsToInsert = DEFAULT_SUBJECTS.map((subject) => ({
        user_id: userId,
        name: subject.name,
        color: subject.color,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("subjects")
        .insert(subjectsToInsert);

      if (error) {
        console.error("기본 과목 생성 실패:", error);
      }
    } catch (error) {
      console.error("기본 과목 생성 중 오류:", error);
    }
  }, []);

  // 과목 추가 (로그인 상태에 따라 분기)
  const addSubject = useCallback(
    async (name: string, color: string): Promise<boolean> => {
      console.log("🔍 useGlobalSubjects - addSubject 시작");
      console.log("🔍 받은 과목 이름:", name);
      console.log("🔍 받은 색상:", color);
      console.log("🔍 현재 과목 목록:", subjects);

      // 에러 메시지 초기화
      setErrorMessage("");

      if (!name.trim()) {
        console.log("❌ 과목 이름이 비어있음");
        setErrorMessage("과목 이름을 입력해주세요.");
        return false;
      }

      console.log("✅ 과목 이름 유효 - 새 과목 생성");
      const newSubject: Subject = {
        id: uid(),
        name: name.trim(),
        color,
      };
      console.log("🔍 생성된 새 과목:", newSubject);

      const updatedSubjects = [...subjects, newSubject];
      console.log("🔍 업데이트된 과목 목록:", updatedSubjects);

      setSubjects(updatedSubjects);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: Supabase에 저장
          const { error } = await supabase.from("subjects").insert({
            user_id: user.id,
            name: newSubject.name,
            color: newSubject.color,
            created_at: new Date().toISOString(),
          });

          if (error) {
            console.error("Supabase 과목 추가 실패:", error);
            // 롤백
            setSubjects(subjects);
            setErrorMessage("과목 추가에 실패했습니다.");
            return false;
          }
        } else {
          // 로그인 안된 사용자: localStorage에 저장
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
        }

        console.log("✅ 과목 추가 완료");
        return true;
      } catch (error) {
        console.error("과목 추가 중 오류:", error);
        // 롤백
        setSubjects(subjects);
        setErrorMessage("과목 추가에 실패했습니다.");
        return false;
      }
    },
    [subjects]
  );

  // 과목 삭제 (로그인 상태에 따라 분기)
  const deleteSubject = useCallback(
    async (subjectId: string): Promise<boolean> => {
      const updatedSubjects = subjects.filter(
        (subject) => subject.id !== subjectId
      );
      setSubjects(updatedSubjects);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: Supabase에서 삭제
          const { error } = await supabase
            .from("subjects")
            .delete()
            .eq("user_id", user.id)
            .eq("id", subjectId);

          if (error) {
            console.error("Supabase 과목 삭제 실패:", error);
            // 롤백
            setSubjects(subjects);
            return false;
          }
        } else {
          // 로그인 안된 사용자: localStorage에서 삭제
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
        }

        return true;
      } catch (error) {
        console.error("과목 삭제 중 오류:", error);
        // 롤백
        setSubjects(subjects);
        return false;
      }
    },
    [subjects]
  );

  // 과목 수정 (로그인 상태에 따라 분기)
  const updateSubject = useCallback(
    async (
      subjectId: string,
      name: string,
      color: string
    ): Promise<boolean> => {
      if (!name.trim()) {
        console.warn("과목 이름을 입력해주세요.");
        return false;
      }

      // 중복 이름 체크 (자기 자신 제외)
      const isDuplicate = subjects.some(
        (subject) =>
          subject.id !== subjectId &&
          subject.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicate) {
        console.warn("이미 존재하는 과목 이름입니다.");
        return false;
      }

      const updatedSubjects = subjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, name: name.trim(), color }
          : subject
      );

      setSubjects(updatedSubjects);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: Supabase에서 수정
          const { error } = await supabase
            .from("subjects")
            .update({
              name: name.trim(),
              color,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("id", subjectId);

          if (error) {
            console.error("Supabase 과목 수정 실패:", error);
            // 롤백
            setSubjects(subjects);
            return false;
          }
        } else {
          // 로그인 안된 사용자: localStorage에서 수정
          localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
        }

        return true;
      } catch (error) {
        console.error("과목 수정 중 오류:", error);
        // 롤백
        setSubjects(subjects);
        return false;
      }
    },
    [subjects]
  );

  // 초기화
  useEffect(() => {
    if (!isInitialized) {
      loadSubjects();
      setIsInitialized(true);
    }
  }, [isInitialized, loadSubjects]);

  return {
    subjects,
    isInitialized,
    errorMessage,
    addSubject,
    deleteSubject,
    updateSubject,
    loadSubjects,
  };
};
