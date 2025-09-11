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
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 과목 목록 불러오기 (로그인 상태에 따라 분기)
  const loadSubjects = async () => {
    console.log("🔄 useGlobalSubjects - loadSubjects 시작");
    try {
      // 세션 상태를 정확히 확인
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("🔍 세션 상태:", { session: !!session, sessionError });

      if (sessionError) {
        console.log("과목 로드 - 세션 확인 중 오류:", sessionError);
        // 세션 오류 시 모든 Supabase 관련 로컬 스토리지 정리
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            localStorage.removeItem(key);
            console.log("만료된 세션 정보 제거:", key);
          }
        });
      }

      if (session && !sessionError) {
        console.log(
          "🔍 로그인된 사용자 - Supabase에서 과목 로드:",
          session.user.email
        );
        // 로그인된 사용자: user_data JSONB에서 로드
        const { data, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Supabase 과목 로드 실패:", error);
          setSubjects(DEFAULT_SUBJECTS);
          return;
        }

        const userData = data?.data || {};
        const subjects = userData.subjects || [];

        if (subjects.length === 0) {
          // 기본 과목이 없으면 생성
          await createDefaultSubjects(session.user.id);
          setSubjects(DEFAULT_SUBJECTS);
        } else {
          setSubjects(subjects);
        }
      } else {
        // 로그인 안된 사용자: 기본 과목만 표시
        console.log(
          "🔍 로그인 안됨 - 기본 과목만 표시 (세션:",
          !!session,
          "에러:",
          !!sessionError,
          ")"
        );
        setSubjects(DEFAULT_SUBJECTS);
      }
      console.log("✅ loadSubjects 완료");
    } catch (error) {
      console.error("❌ 과목 목록 로드 중 오류 발생:", error);
      setSubjects(DEFAULT_SUBJECTS);
    }
  };

  // 기본 과목들을 user_data JSONB에 생성
  const createDefaultSubjects = useCallback(async (userId: string) => {
    try {
      const { data: existingData, error: fetchError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("기존 데이터 조회 실패:", fetchError);
        return;
      }

      const userData = existingData?.data || {};

      let error;
      if (existingData) {
        // 기존 데이터가 있으면 UPDATE
        const { error: updateError } = await supabase
          .from("user_data")
          .update({
            data: {
              ...userData,
              subjects: DEFAULT_SUBJECTS,
            },
          })
          .eq("user_id", userId);
        error = updateError;
      } else {
        // 기존 데이터가 없으면 INSERT
        const { error: insertError } = await supabase.from("user_data").insert({
          user_id: userId,
          data: {
            ...userData,
            subjects: DEFAULT_SUBJECTS,
          },
        });
        error = insertError;
      }

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
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // 로그인된 사용자: user_data JSONB에 저장
          const { data: existingData, error: fetchError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", session.user.id)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("기존 데이터 조회 실패:", fetchError);
            setSubjects(subjects);
            setErrorMessage("과목 추가에 실패했습니다.");
            return false;
          }

          const userData = existingData?.data || {};

          let error;
          if (existingData) {
            // 기존 데이터가 있으면 UPDATE
            const { error: updateError } = await supabase
              .from("user_data")
              .update({
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              })
              .eq("user_id", session.user.id);
            error = updateError;
          } else {
            // 기존 데이터가 없으면 INSERT
            const { error: insertError } = await supabase
              .from("user_data")
              .insert({
                user_id: session.user.id,
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              });
            error = insertError;
          }

          if (error) {
            console.error("Supabase 과목 추가 실패:", error);
            // 롤백
            setSubjects(subjects);
            setErrorMessage("과목 추가에 실패했습니다.");
            return false;
          }
        } else {
          // 로그인 안된 사용자: 로컬 상태만 업데이트 (저장 안함)
          console.log("로그인하지 않은 사용자 - 로컬 상태만 업데이트");
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
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // 로그인된 사용자: user_data JSONB에서 삭제
          const { data: existingData, error: fetchError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", session.user.id)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("기존 데이터 조회 실패:", fetchError);
            setSubjects(subjects);
            return false;
          }

          const userData = existingData?.data || {};

          let error;
          if (existingData) {
            // 기존 데이터가 있으면 UPDATE
            const { error: updateError } = await supabase
              .from("user_data")
              .update({
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              })
              .eq("user_id", session.user.id);
            error = updateError;
          } else {
            // 기존 데이터가 없으면 INSERT (빈 과목 목록)
            const { error: insertError } = await supabase
              .from("user_data")
              .insert({
                user_id: session.user.id,
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              });
            error = insertError;
          }

          if (error) {
            console.error("Supabase 과목 삭제 실패:", error);
            // 롤백
            setSubjects(subjects);
            return false;
          }
        } else {
          // 로그인 안된 사용자: 로컬 상태만 업데이트 (저장 안함)
          console.log("로그인하지 않은 사용자 - 로컬 상태만 업데이트");
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
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // 로그인된 사용자: user_data JSONB에서 수정
          const { data: existingData, error: fetchError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", session.user.id)
            .single();

          if (fetchError && fetchError.code !== "PGRST116") {
            console.error("기존 데이터 조회 실패:", fetchError);
            setSubjects(subjects);
            return false;
          }

          const userData = existingData?.data || {};

          let error;
          if (existingData) {
            // 기존 데이터가 있으면 UPDATE
            const { error: updateError } = await supabase
              .from("user_data")
              .update({
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              })
              .eq("user_id", session.user.id);
            error = updateError;
          } else {
            // 기존 데이터가 없으면 INSERT
            const { error: insertError } = await supabase
              .from("user_data")
              .insert({
                user_id: session.user.id,
                data: {
                  ...userData,
                  subjects: updatedSubjects,
                },
              });
            error = insertError;
          }

          if (error) {
            console.error("Supabase 과목 수정 실패:", error);
            // 롤백
            setSubjects(subjects);
            return false;
          }
        } else {
          // 로그인 안된 사용자: 로컬 상태만 업데이트 (저장 안함)
          console.log("로그인하지 않은 사용자 - 로컬 상태만 업데이트");
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

  // 초기화 - 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    console.log("🔄 useGlobalSubjects - 초기화 시작");
    loadSubjects();
  }, []); // 빈 의존성 배열로 마운트 시 한 번만 실행

  return {
    subjects,
    errorMessage,
    addSubject,
    deleteSubject,
    updateSubject,
    loadSubjects,
  };
};
