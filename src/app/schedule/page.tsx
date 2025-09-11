"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import Button from "../../components/atoms/Button";
import Label from "../../components/atoms/Label";
import PDFDownloadButton from "../../components/molecules/PDFDownloadButton";
import StudentPanel from "../../components/organisms/StudentPanel";
import TimeTableGrid from "../../components/organisms/TimeTableGrid";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useGlobalSubjects } from "../../hooks/useGlobalSubjects";
import { useSessionManagement } from "../../hooks/useSessionManagementImproved";
import { useStudentManagementClean } from "../../hooks/useStudentManagementClean";
import { useStudentPanel } from "../../hooks/useStudentPanel";
import { useTimeValidation } from "../../hooks/useTimeValidation";
import type { Enrollment, Session, Student } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
import type { GroupSessionData } from "../../types/scheduleTypes";
import { supabase } from "../../utils/supabaseClient";
import styles from "./Schedule.module.css";

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial); // 초기값을 항상 사용
  const [isHydrated, setIsHydrated] = useState(false);

  // 클라이언트에서만 localStorage 접근
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // localStorage 접근 실패 시 초기값 유지
    }
    setIsHydrated(true);
  }, [key]);

  const setValueWithStorage = (newValue: T | ((prev: T) => T)) => {
    const finalValue =
      typeof newValue === "function"
        ? (newValue as (prev: T) => T)(value)
        : newValue;
    setValue(finalValue);

    // 클라이언트에서만 localStorage에 저장
    if (isHydrated) {
      try {
        localStorage.setItem(key, JSON.stringify(finalValue));
      } catch {
        // localStorage 저장 실패 시 무시
      }
    }
  };

  return [value, setValueWithStorage] as const;
}

export default function SchedulePage() {
  return (
    <AuthGuard requireAuth={true}>
      <SchedulePageContent />
    </AuthGuard>
  );
}

function SchedulePageContent() {
  const { subjects } = useGlobalSubjects();
  const { students = [] } = useStudentManagementClean();
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // 🆕 세션 관리 훅 사용
  const {
    sessions,
    enrollments,
    addSession,
    updateSession,
    deleteSession,
    isLoading: sessionLoading,
    error: sessionError,
  } = useSessionManagement(students, subjects);

  // 🆕 데이터 로딩 완료 후 selectedStudentId 복원
  useEffect(() => {
    if (!sessionLoading && students.length > 0) {
      // 클라이언트에서만 localStorage 접근
      if (typeof window !== "undefined") {
        try {
          const savedStudentId = localStorage.getItem("ui:selectedStudent");
          if (savedStudentId && students.some((s) => s.id === savedStudentId)) {
            console.log("🔄 저장된 학생 선택 복원:", savedStudentId);
            setSelectedStudentId(savedStudentId);
          }
        } catch {
          // localStorage 접근 실패 시 무시
        }
      }
    }
  }, [sessionLoading, students, setSelectedStudentId]);

  // 🆕 학생 데이터 디버깅
  useEffect(() => {
    console.log("🆕 학생 데이터 상태:", {
      studentsCount: students.length,
      selectedStudentId,
      selectedStudentName: students.find((s) => s.id === selectedStudentId)
        ?.name,
    });
  }, [students, selectedStudentId]);

  // 🆕 selectedStudentId 변경 감지 및 저장
  useEffect(() => {
    console.log("🆕 selectedStudentId 변경됨:", selectedStudentId);
    // 클라이언트에서만 localStorage 접근
    if (typeof window !== "undefined") {
      try {
        if (selectedStudentId) {
          localStorage.setItem("ui:selectedStudent", selectedStudentId);
        } else {
          localStorage.removeItem("ui:selectedStudent");
        }
      } catch {
        // localStorage 접근 실패 시 무시
      }
    }
  }, [selectedStudentId]);

  // 🆕 로그인 상태 감지 및 로그아웃 시 정리
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log("🔔 로그아웃 상태 감지 - 컴포넌트 정리");
          // 로그아웃 상태에서는 불필요한 로그 방지
          return;
        }

        console.log("🔔 로그인 상태 확인됨:", user.email);
      } catch (error) {
        console.error("🔔 인증 상태 확인 실패:", error);
      }
    };

    checkAuthState();
  }, []);

  // 커스텀 훅 사용
  const { sessions: displaySessions } = useDisplaySessions(
    sessions,
    enrollments,
    selectedStudentId
  );

  const studentPanelState = useStudentPanel(
    students,
    selectedStudentId,
    setSelectedStudentId
  );

  const { validateTimeRange, getNextHour } = useTimeValidation();

  // 🆕 그룹 수업 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupSessionData>({
    studentIds: [], // 빈 배열로 초기화
    subjectId: "",
    weekday: 0,
    startTime: "",
    endTime: "",
  });

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState("");

  // 🆕 모달용 학생 검색 결과
  const filteredStudentsForModal = useMemo(() => {
    if (!studentInputValue.trim()) return [];
    return students.filter((student) =>
      student.name.toLowerCase().includes(studentInputValue.toLowerCase())
    );
  }, [students, studentInputValue]);

  // 🆕 수업 편집 모달용 학생 입력 상태
  const [editStudentInputValue, setEditStudentInputValue] = useState("");

  // 🆕 수업 편집 모달용 시간 상태
  const [editModalTimeData, setEditModalTimeData] = useState({
    startTime: "",
    endTime: "",
  });

  // 🆕 수업 편집 모달용 시작 시간 변경 처리 (종료 시간보다 늦지 않도록)
  const handleEditStartTimeChange = (newStartTime: string) => {
    setEditModalTimeData((prev) => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 경고만 표시하고 자동 조정하지 않음
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 수업 편집 모달용 종료 시간 변경 처리 (시작 시간보다 빠르지 않도록)
  const handleEditEndTimeChange = (newEndTime: string) => {
    setEditModalTimeData((prev) => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 경고만 표시하고 자동 조정하지 않음
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 학생 입력값 상태 디버깅 및 최적화
  useEffect(() => {
    console.log("🔄 editStudentInputValue 상태 변경:", editStudentInputValue);
    console.log("🔄 버튼 활성화 조건:", !!editStudentInputValue.trim());
  }, [editStudentInputValue]);

  // 🆕 세션 편집 모달 상태 (useCallback보다 앞에 선언)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<Session | null>(null);
  const [tempSubjectId, setTempSubjectId] = useState<string>(""); // 🆕 임시 과목 ID
  const [tempEnrollments, setTempEnrollments] = useState<Enrollment[]>([]); // 🆕 임시 enrollment 관리

  // 🆕 학생 입력값 변경 핸들러 최적화
  const handleEditStudentInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      console.log("🔄 학생 입력값 변경:", value);
      setEditStudentInputValue(value);
    },
    []
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAdd = useCallback(
    (studentId?: string) => {
      console.log("🔄 handleEditStudentAdd 호출:", {
        studentId,
        editStudentInputValue,
      });

      const targetStudentId =
        studentId ||
        students.find(
          (s) => s.name.toLowerCase() === editStudentInputValue.toLowerCase()
        )?.id;

      console.log("🔄 찾은 학생 ID:", targetStudentId);

      if (!targetStudentId) {
        console.log("❌ 학생을 찾을 수 없음");
        // 존재하지 않는 학생인 경우 입력창을 초기화하지 않고 피드백만 제공
        return;
      }

      // 🆕 학생이 이미 추가되어 있는지 확인
      const isAlreadyAdded = editModalData?.enrollmentIds?.some(
        (enrollmentId: string) => {
          const enrollment = enrollments.find((e) => e.id === enrollmentId);
          return enrollment?.studentId === targetStudentId;
        }
      );

      if (isAlreadyAdded) {
        console.log("❌ 이미 추가된 학생");
        setEditStudentInputValue("");
        return;
      }

      // enrollment가 있는지 확인하고 없으면 생성
      let enrollment = enrollments.find(
        (e) =>
          e.studentId === targetStudentId &&
          e.subjectId ===
            (() => {
              const firstEnrollment = enrollments.find(
                (e) => e.id === editModalData?.enrollmentIds?.[0]
              );
              return firstEnrollment?.subjectId || "";
            })()
      );

      if (!enrollment) {
        // 🆕 임시 enrollment 객체를 생성하여 tempEnrollments에 추가
        enrollment = {
          id: crypto.randomUUID(),
          studentId: targetStudentId,
          subjectId: (() => {
            const firstEnrollment = enrollments.find(
              (e) => e.id === editModalData?.enrollmentIds?.[0]
            );
            return firstEnrollment?.subjectId || "";
          })(),
        };

        // 🆕 임시 enrollment를 tempEnrollments에 추가
        setTempEnrollments((prev) => [...prev, enrollment!]);
      }

      // enrollmentIds에 추가 (최대 14명 제한)
      if (
        editModalData &&
        !editModalData.enrollmentIds?.includes(enrollment.id)
      ) {
        // 🆕 최대 14명 제한 확인
        const currentCount = editModalData.enrollmentIds?.length || 0;
        if (currentCount >= 14) {
          alert("최대 14명까지 추가할 수 있습니다.");
          return;
        }

        // 🆕 모달 상태만 업데이트 (실제 세션 데이터는 저장 버튼에서 업데이트)
        setEditModalData((prev: Session | null) =>
          prev
            ? {
                ...prev,
                enrollmentIds: [...(prev.enrollmentIds || []), enrollment!.id],
              }
            : null
        );
        // 성공적으로 추가된 경우에만 입력창 초기화
        setEditStudentInputValue("");
      }
    },
    [editStudentInputValue, students, enrollments, editModalData]
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAddClick = useCallback(() => {
    console.log("🔄 학생 추가 버튼 클릭");
    handleEditStudentAdd();
  }, [handleEditStudentAdd]);

  // 🆕 학생 추가 함수 (최대 14명 제한)
  const addStudent = (studentId: string) => {
    if (!groupModalData.studentIds.includes(studentId)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }

      setGroupModalData((prev) => ({
        ...prev,
        studentIds: [...prev.studentIds, studentId],
      }));
    }
    setStudentInputValue("");
  };

  // 🆕 학생 제거 함수
  const removeStudent = (studentId: string) => {
    setGroupModalData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => id !== studentId),
    }));
  };

  // 🆕 입력창에서 학생 추가 함수 (최대 14명 제한)
  const addStudentFromInput = () => {
    const trimmedValue = studentInputValue.trim();
    if (!trimmedValue) return;

    // 정확한 이름으로 학생 찾기
    const student = students.find((s) => s.name === trimmedValue);
    if (student && !groupModalData.studentIds.includes(student.id)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }
      addStudent(student.id);
    }
  };

  // 🆕 입력창 키보드 이벤트 처리
  const handleStudentInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStudentFromInput();
      // 🆕 입력창 완전 초기화 (이중 보장)
      setStudentInputValue("");
    }
  };

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = async (data: GroupSessionData) => {
    console.log("🔍 addGroupSession 시작:", data);

    // 시간 유효성 검사
    if (!validateTimeRange(data.startTime, data.endTime)) {
      console.log("❌ 시간 유효성 검사 실패");
      alert("시작 시간은 종료 시간보다 빨라야 합니다.");
      return;
    }
    console.log("✅ 시간 유효성 검사 통과");

    // 🆕 과목 선택 검증
    if (!data.subjectId) {
      console.log("❌ 과목 선택 검증 실패");
      alert("과목을 선택해주세요.");
      return;
    }
    console.log("✅ 과목 선택 검증 통과");

    // 🆕 학생 선택 검증
    if (!data.studentIds || data.studentIds.length === 0) {
      console.log("❌ 학생 선택 검증 실패");
      alert("학생을 선택해주세요.");
      return;
    }
    console.log("✅ 학생 선택 검증 통과");

    console.log("🔍 addSession 호출 시작:", {
      subjectId: data.subjectId,
      studentIds: data.studentIds,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    try {
      console.log("🔄 addSession 함수 호출 중...");
      await addSession({
        studentIds: data.studentIds,
        subjectId: data.subjectId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
      });
      console.log("✅ addSession 함수 완료");

      console.log("🔄 모달 닫기 중...");
      setShowGroupModal(false);
      console.log("✅ 세션 추가 완료");
    } catch (error) {
      console.error("❌ 세션 추가 실패:", error);
      alert("세션 추가에 실패했습니다.");
    }
  };

  // 🆕 그룹 수업 모달 열기
  const openGroupModal = (weekday: number, time: string) => {
    console.log("🆕 그룹 수업 모달 열기:", { weekday, time });
    setGroupModalData({
      studentIds: [], // 빈 배열로 초기화
      subjectId: "",
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });
    setShowGroupModal(true);
    console.log("🆕 모달 상태 설정 완료:", { showGroupModal: true });
  };

  // 🆕 시작 시간 변경 처리 (종료 시간보다 늦지 않도록)
  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData((prev) => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 경고만 표시하고 자동 조정하지 않음
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 종료 시간 변경 처리 (시작 시간보다 빠르지 않도록)
  const handleEndTimeChange = (newEndTime: string) => {
    setGroupModalData((prev) => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 경고만 표시하고 자동 조정하지 않음
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        // 경고 메시지 표시 (선택사항)
        console.warn(
          "종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요."
        );
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 드래그 앤 드롭 처리
  const handleDrop = (weekday: number, time: string, enrollmentId: string) => {
    console.log("🆕 handleDrop 호출됨:", { weekday, time, enrollmentId });

    // 학생 ID인지 확인 (enrollment가 없는 경우)
    if (enrollmentId.startsWith("student:")) {
      const studentId = enrollmentId.replace("student:", "");
      console.log("🆕 학생 ID로 드롭됨:", studentId);

      // 학생 정보 찾기
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        console.log("🆕 학생을 찾을 수 없음:", studentId);
        return;
      }

      console.log("🆕 그룹 수업 모달 데이터 설정 (학생 ID):", {
        studentId,
        weekday,
        startTime: time,
        endTime: getNextHour(time),
      });

      // 🆕 그룹 수업 모달 열기 (과목은 선택되지 않은 상태)
      setGroupModalData({
        studentIds: [studentId],
        subjectId: "", // 과목은 선택되지 않은 상태
        weekday,
        startTime: time,
        endTime: getNextHour(time),
      });

      console.log("🆕 showGroupModal을 true로 설정");
      setShowGroupModal(true);
      return;
    }

    // 기존 enrollment 처리
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    console.log("🆕 찾은 enrollment:", enrollment);

    if (!enrollment) {
      console.log("🆕 enrollment를 찾을 수 없음");
      return;
    }

    console.log("🆕 그룹 수업 모달 데이터 설정:", {
      studentId: enrollment.studentId,
      subjectId: enrollment.subjectId,
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });

    // 🆕 그룹 수업 모달 열기 (과목은 선택되지 않은 상태)
    setGroupModalData({
      studentIds: [enrollment.studentId], // 배열로 변경
      subjectId: "", // 과목은 선택되지 않은 상태로 초기화
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });

    console.log("🆕 showGroupModal을 true로 설정");
    setShowGroupModal(true);

    // 🆕 드래그 상태 강제 해제
    setTimeout(() => {
      // 모든 드래그 이벤트 강제 종료
      const dragEndEvent = new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(dragEndEvent);

      // 마우스 업 이벤트 강제 발생
      const mouseUpEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
      });
      document.dispatchEvent(mouseUpEvent);

      console.log("🆕 드래그 상태 강제 해제 완료");
    }, 100);

    console.log("🆕 handleDrop 완료");
  };

  // 🆕 빈 공간 클릭 처리
  const handleEmptySpaceClick = (weekday: number, time: string) => {
    console.log("🆕 빈 공간 클릭됨:", { weekday, time });
    openGroupModal(weekday, time);
  };

  // 🆕 세션 클릭 처리
  const handleSessionClick = (session: Session) => {
    setEditModalData(session);
    setEditModalTimeData({
      startTime: session.startsAt,
      endTime: session.endsAt,
    });
    // 🆕 임시 과목 ID 초기화
    const firstEnrollment = enrollments.find(
      (e) => e.id === session.enrollmentIds?.[0]
    );
    setTempSubjectId(firstEnrollment?.subjectId || "");
    setTempEnrollments([]); // 🆕 임시 enrollment 초기화
    setShowEditModal(true);
  };

  // 🆕 PDF 다운로드 처리
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // 드래그 시작 처리
  const handleDragStart = (e: React.DragEvent, student: Student) => {
    // 해당 학생의 첫 번째 enrollment ID를 찾아서 전달
    const studentEnrollment = enrollments.find(
      (e) => e.studentId === student.id
    );
    if (studentEnrollment) {
      console.log("🆕 드래그 시작 - enrollment ID 전달:", studentEnrollment.id);
      e.dataTransfer.setData("text/plain", studentEnrollment.id);
    } else {
      console.log(
        "🆕 드래그 시작 - 학생 ID 전달 (enrollment 없음):",
        student.id
      );
      // enrollment가 없으면 학생 ID를 직접 전달
      e.dataTransfer.setData("text/plain", `student:${student.id}`);
    }
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="timetable-container" style={{ padding: 16 }}>
      <div className={styles.pageHeader}>
        <h2>주간 시간표</h2>
        {sessionLoading && (
          <div style={{ color: "var(--color-blue-500)", fontSize: "14px" }}>
            {sessionError
              ? "데이터 로드 중 오류가 발생했습니다."
              : "세션 데이터를 로드 중..."}
          </div>
        )}
        {sessionError && (
          <div
            style={{
              color: "var(--color-red-500)",
              fontSize: "14px",
              backgroundColor: "var(--color-red-50)",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-red-200)",
              marginTop: "8px",
            }}
          >
            ⚠️ {sessionError}
            <br />
            <small style={{ color: "var(--color-gray-600)" }}>
              로컬 데이터로 계속 작업할 수 있습니다.
            </small>
          </div>
        )}
      </div>
      {selectedStudentId ? (
        <p style={{ color: "var(--color-gray-500)" }}>
          {students.find((s) => s.id === selectedStudentId)?.name} 학생의
          시간표입니다. 다른 학생을 선택하거나 선택 해제하여 전체 시간표를 볼 수
          있습니다.
        </p>
      ) : (
        <p style={{ color: "var(--color-gray-500)" }}>
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}

      {/* PDF 다운로드 버튼 */}
      <PDFDownloadButton
        timeTableRef={timeTableRef}
        selectedStudent={students.find((s) => s.id === selectedStudentId)}
        isDownloading={isDownloading}
        onDownloadStart={() => setIsDownloading(true)}
        onDownloadEnd={() => setIsDownloading(false)}
      />

      {/* 🆕 시간표 그리드 */}
      <div ref={timeTableRef}>
        <TimeTableGrid
          sessions={displaySessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onSessionClick={handleSessionClick}
          onDrop={handleDrop}
          onEmptySpaceClick={handleEmptySpaceClick}
          selectedStudentId={selectedStudentId} // 🆕 선택된 학생 ID 전달
        />
      </div>

      {/* 🆕 학생 패널 */}
      <StudentPanel
        selectedStudentId={selectedStudentId}
        panelState={studentPanelState}
        onMouseDown={studentPanelState.handleMouseDown}
        onStudentClick={studentPanelState.handleStudentClick}
        onDragStart={handleDragStart}
        onSearchChange={studentPanelState.setSearchQuery}
      />

      {/* 그룹 수업 추가 모달 */}
      {showGroupModal && (
        <div className="modal-backdrop">
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h4 className={styles.modalTitle}>수업 추가</h4>
              <div className={styles.modalForm}>
                <div className="form-group">
                  <Label htmlFor="modal-student" required>
                    학생
                  </Label>
                  <div className={styles.studentTagsContainer}>
                    {/* 선택된 학생 태그들 */}
                    {groupModalData.studentIds.map((studentId) => {
                      const student = students.find((s) => s.id === studentId);
                      return student ? (
                        <span key={studentId} className={styles.studentTag}>
                          {student.name}
                          <button
                            type="button"
                            className={styles.removeStudentBtn}
                            onClick={() => removeStudent(studentId)}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className={styles.studentInputContainer}>
                    <input
                      id="modal-student-input"
                      type="text"
                      className="form-input"
                      placeholder="학생 이름을 입력하세요"
                      value={studentInputValue}
                      onChange={(e) => setStudentInputValue(e.target.value)}
                      onKeyDown={handleStudentInputKeyDown}
                    />
                    <button
                      type="button"
                      className={styles.addStudentBtn}
                      onClick={addStudentFromInput}
                      disabled={!studentInputValue.trim()}
                    >
                      추가
                    </button>
                  </div>
                  {/* 학생 검색 결과 */}
                  {studentInputValue && (
                    <div className={styles.studentSearchResults}>
                      {(() => {
                        const filteredStudents =
                          filteredStudentsForModal.filter(
                            (student) =>
                              !groupModalData.studentIds.includes(student.id)
                          );

                        if (filteredStudents.length === 0) {
                          const studentExists = students.some(
                            (s) =>
                              s.name.toLowerCase() ===
                              studentInputValue.toLowerCase()
                          );

                          console.log("🔍 그룹 모달 학생 검색 디버깅:", {
                            studentInputValue,
                            filteredStudentsLength: filteredStudents.length,
                            studentExists,
                            totalStudents: students.length,
                          });

                          return (
                            <div className={styles.noSearchResults}>
                              <span>검색 결과가 없습니다</span>
                              {!studentExists && (
                                <span className={styles.studentNotFound}>
                                  (존재하지 않는 학생입니다)
                                </span>
                              )}
                            </div>
                          );
                        }

                        return filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className={styles.studentSearchItem}
                            onClick={() => addStudent(student.id)}
                          >
                            {student.name}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-subject" required>
                    과목
                  </Label>
                  <select
                    id="modal-subject"
                    className="form-select"
                    value={groupModalData.subjectId}
                    onChange={(e) =>
                      setGroupModalData((prev) => ({
                        ...prev,
                        subjectId: e.target.value,
                      }))
                    }
                    disabled={groupModalData.studentIds.length === 0}
                  >
                    <option value="">
                      {groupModalData.studentIds.length === 0
                        ? "먼저 학생을 선택하세요"
                        : "과목을 선택하세요"}
                    </option>
                    {groupModalData.studentIds.length > 0 &&
                      subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-weekday" required>
                    요일
                  </Label>
                  <select
                    id="modal-weekday"
                    className="form-select"
                    value={groupModalData.weekday}
                    onChange={(e) =>
                      setGroupModalData((prev) => ({
                        ...prev,
                        weekday: Number(e.target.value),
                      }))
                    }
                  >
                    {weekdays.map((w, idx) => (
                      <option key={idx} value={idx}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-start-time" required>
                    시작 시간
                  </Label>
                  <input
                    id="modal-start-time"
                    type="time"
                    className="form-input"
                    value={groupModalData.startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-end-time" required>
                    종료 시간
                  </Label>
                  <input
                    id="modal-end-time"
                    type="time"
                    className="form-input"
                    value={groupModalData.endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-room">강의실</Label>
                  <input
                    id="modal-room"
                    type="text"
                    className="form-input"
                    placeholder="강의실 (선택사항)"
                    value={groupModalData.room || ""}
                    onChange={(e) =>
                      setGroupModalData((prev) => ({
                        ...prev,
                        room: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  variant="transparent"
                  onClick={() => setShowGroupModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={() => addGroupSession(groupModalData)}
                  disabled={
                    groupModalData.studentIds.length === 0 ||
                    !groupModalData.subjectId ||
                    !groupModalData.startTime ||
                    !groupModalData.endTime
                  }
                >
                  추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 세션 편집 모달 */}
      {showEditModal && editModalData && (
        <div className="modal-backdrop">
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h4 className={styles.modalTitle}>수업 편집</h4>
              <div className={styles.modalForm}>
                <div className="form-group">
                  <Label htmlFor="edit-modal-students" required>
                    학생
                  </Label>
                  <div className={styles.studentTagsContainer}>
                    {/* 선택된 학생들을 태그로 표시 */}
                    {(() => {
                      // 🆕 기존 enrollments와 tempEnrollments를 합쳐서 모든 enrollment를 가져옴
                      const allEnrollments = [
                        ...enrollments,
                        ...tempEnrollments,
                      ];

                      const selectedStudents =
                        editModalData.enrollmentIds
                          ?.map((enrollmentId) => {
                            const enrollment = allEnrollments.find(
                              (e) => e.id === enrollmentId
                            );
                            if (!enrollment) return null;
                            const student = students.find(
                              (s) => s.id === enrollment.studentId
                            );
                            return student
                              ? { id: student.id, name: student.name }
                              : null;
                          })
                          .filter(Boolean) || [];

                      return selectedStudents.map((student) => (
                        <div key={student!.id} className={styles.studentTag}>
                          <span>{student!.name}</span>
                          <button
                            type="button"
                            className={styles.removeStudentBtn}
                            onClick={() => {
                              // 🆕 학생 제거 로직 (tempEnrollments도 고려)
                              const allEnrollments = [
                                ...enrollments,
                                ...tempEnrollments,
                              ];

                              const updatedEnrollmentIds =
                                editModalData.enrollmentIds?.filter(
                                  (id) =>
                                    id !==
                                    editModalData.enrollmentIds?.find(
                                      (enrollmentId) => {
                                        const enrollment = allEnrollments.find(
                                          (e) => e.id === enrollmentId
                                        );
                                        return (
                                          enrollment?.studentId === student!.id
                                        );
                                      }
                                    )
                                );
                              // 🆕 tempEnrollments에서도 해당 학생 제거
                              setTempEnrollments((prev) =>
                                prev.filter(
                                  (enrollment) =>
                                    enrollment.studentId !== student!.id
                                )
                              );

                              setEditModalData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      enrollmentIds: updatedEnrollmentIds || [],
                                    }
                                  : null
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                  {/* 학생 추가 입력창 */}
                  <div className={styles.studentInputContainer}>
                    <input
                      type="text"
                      placeholder="학생 이름을 입력하세요"
                      className="form-input"
                      value={editStudentInputValue}
                      onChange={handleEditStudentInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          console.log("🔄 Enter 키로 학생 추가 시도");
                          handleEditStudentAdd();
                          // 🆕 입력창 완전 초기화
                          setEditStudentInputValue("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.addStudentBtn}
                      onClick={handleEditStudentAddClick}
                      disabled={
                        !editStudentInputValue || !editStudentInputValue.trim()
                      }
                      style={{
                        opacity:
                          !editStudentInputValue ||
                          !editStudentInputValue.trim()
                            ? 0.5
                            : 1,
                        cursor:
                          !editStudentInputValue ||
                          !editStudentInputValue.trim()
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      추가
                    </button>
                  </div>
                  {/* 🆕 실시간 학생 검색 결과 */}
                  {editStudentInputValue.trim() && (
                    <div className={styles.studentSearchResults}>
                      {(() => {
                        const filteredStudents = students.filter(
                          (student) =>
                            student.name
                              .toLowerCase()
                              .includes(editStudentInputValue.toLowerCase()) &&
                            !editModalData.enrollmentIds?.some(
                              (enrollmentId) => {
                                const enrollment = enrollments.find(
                                  (e) => e.id === enrollmentId
                                );
                                return enrollment?.studentId === student.id;
                              }
                            )
                        );

                        if (filteredStudents.length === 0) {
                          return (
                            <div className={styles.noSearchResults}>
                              <span>검색 결과가 없습니다</span>
                              {!students.some(
                                (s) =>
                                  s.name.toLowerCase() ===
                                  editStudentInputValue.toLowerCase()
                              ) && (
                                <span className={styles.studentNotFound}>
                                  (존재하지 않는 학생입니다)
                                </span>
                              )}
                            </div>
                          );
                        }

                        return filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            className={styles.studentSearchItem}
                            onClick={() => {
                              handleEditStudentAdd(student.id);
                            }}
                          >
                            {student.name}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <Label htmlFor="edit-modal-subject" required>
                    과목
                  </Label>
                  <select
                    id="edit-modal-subject"
                    className="form-select"
                    value={tempSubjectId}
                    onChange={(e) => {
                      const subjectId = e.target.value;
                      setTempSubjectId(subjectId); // 🆕 임시 상태만 업데이트
                    }}
                  >
                    <option value="">과목을 선택하세요</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">요일</label>
                  <select
                    id="edit-modal-weekday"
                    className="form-select"
                    defaultValue={editModalData.weekday}
                  >
                    {weekdays.map((w, idx) => (
                      <option key={idx} value={idx}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">시작 시간</label>
                  <input
                    id="edit-modal-start-time"
                    type="time"
                    className="form-input"
                    value={editModalTimeData.startTime}
                    onChange={(e) => handleEditStartTimeChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">종료 시간</label>
                  <input
                    id="edit-modal-end-time"
                    type="time"
                    className="form-input"
                    value={editModalTimeData.endTime}
                    onChange={(e) => handleEditEndTimeChange(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (confirm("정말로 이 수업을 삭제하시겠습니까?")) {
                      try {
                        await deleteSession(editModalData.id);
                        setShowEditModal(false);
                        console.log("✅ 세션 삭제 완료");
                      } catch (error) {
                        console.error("세션 삭제 실패:", error);
                        alert("세션 삭제에 실패했습니다.");
                      }
                    }
                  }}
                >
                  삭제
                </Button>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="transparent"
                    onClick={() => {
                      setShowEditModal(false);
                      setTempSubjectId(""); // 🆕 임시 상태 초기화
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      const weekday = Number(
                        (
                          document.getElementById(
                            "edit-modal-weekday"
                          ) as HTMLSelectElement
                        )?.value
                      );
                      const startTime = editModalTimeData.startTime;
                      const endTime = editModalTimeData.endTime;

                      if (!startTime || !endTime) return;

                      // 시간 유효성 검사
                      if (!validateTimeRange(startTime, endTime)) {
                        alert("시작 시간은 종료 시간보다 빨라야 합니다.");
                        return;
                      }

                      try {
                        // 현재 세션의 학생 ID들을 가져오기 (기존 enrollment + 임시 enrollment)
                        const allEnrollments = [
                          ...enrollments,
                          ...tempEnrollments,
                        ];
                        const currentStudentIds =
                          (editModalData.enrollmentIds
                            ?.map((enrollmentId) => {
                              const enrollment = allEnrollments.find(
                                (e) => e.id === enrollmentId
                              );
                              return enrollment?.studentId;
                            })
                            .filter(Boolean) as string[]) || [];

                        // 🆕 임시 과목 ID 사용
                        const currentSubjectId = tempSubjectId;

                        await updateSession(editModalData.id, {
                          studentIds: currentStudentIds,
                          subjectId: currentSubjectId,
                          weekday,
                          startTime,
                          endTime,
                          room: editModalData.room,
                        });

                        setShowEditModal(false);
                        setTempSubjectId(""); // 🆕 임시 상태 초기화
                        setTempEnrollments([]); // 🆕 임시 enrollment 초기화
                        console.log("✅ 세션 업데이트 완료");
                      } catch (error) {
                        console.error("세션 업데이트 실패:", error);
                        alert("세션 업데이트에 실패했습니다.");
                      }
                    }}
                  >
                    저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
