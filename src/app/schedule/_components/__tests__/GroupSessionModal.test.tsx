import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import type { GroupSessionData } from "../../../../types/scheduleTypes";
import GroupSessionModal from "../GroupSessionModal";

describe("GroupSessionModal - state updates", () => {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  const subjects = [
    { id: "sub-1", name: "수학" },
    { id: "sub-2", name: "영어" },
  ];

  const students = [
    { id: "stu-1", name: "홍길동" },
    { id: "stu-2", name: "김영희" },
  ];

  function createStateController(initial: GroupSessionData) {
    let current = { ...initial };
    const setGroupModalData: React.Dispatch<
      React.SetStateAction<GroupSessionData>
    > = (updater) => {
      if (typeof updater === "function") {
        current = (updater as (prev: GroupSessionData) => GroupSessionData)(
          current
        );
      } else {
        current = updater;
      }
    };
    return { get: () => current, set: setGroupModalData };
  }

  it("updates subjectId, weekday via setGroupModalData on change (강의실 UI 제거됨, 요일은 chip+popover)", () => {
    const initial: GroupSessionData = {
      studentIds: ["stu-1"],
      subjectId: "",
      weekday: 1,
      startTime: "10:00",
      endTime: "11:00",
      yPosition: 1,
    };

    const controller = createStateController(initial);

    // weekStartDate prop 미지정 → 캘린더 popover 가 fallback 7-grid (요일 only) 로 렌더.
    // 7-grid 의 weekday button 직접 클릭으로 weekday state 변경 검증.
    const { getByRole, rerender } = render(
      <GroupSessionModal
        isOpen={true}
        groupModalData={controller.get()}
        setGroupModalData={controller.set}
        setShowGroupModal={() => {}}
        removeStudent={() => {}}
        studentInputValue=""
        setStudentInputValue={() => {}}
        handleStudentInputKeyDown={() => {}}
        addStudentFromInput={() => {}}
        filteredStudentsForModal={[]}
        addStudent={() => {}}
        subjects={subjects}
        teachers={[]}
        students={students}
        weekdays={weekdays}
        handleStartTimeChange={() => {}}
        handleEndTimeChange={() => {}}
        groupTimeError=""
        addGroupSession={() => {}}
        onCreateStudent={() => {}}
        studentCreating={false}
        studentCreateError=""
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /다음/ }));

    const subjectSelect = getByRole("combobox", {
      name: /과목/,
    }) as HTMLSelectElement;
    fireEvent.change(subjectSelect, { target: { value: "sub-1" } });
    expect(controller.get().subjectId).toBe("sub-1");

    // 1) weekday chip 클릭 → fallback popover 열림
    const weekdayChip = getByRole("button", { name: /요일\/날짜/ });
    fireEvent.click(weekdayChip);

    // 2) popover 7-grid 안 "화" button 클릭 (initial weekdays = ["일","월","화","수","목","금","토"])
    //    fallback popover 의 grid button 은 weekday label 텍스트만 노출.
    const tueButton = screen.getAllByRole("button").find((b) => b.textContent === "화");
    expect(tueButton).toBeDefined();
    fireEvent.click(tueButton!);
    // initial weekdays 배열에서 "화" = idx 2
    expect(controller.get().weekday).toBe(2);
  });
});

describe("GroupSessionModal - 신규 학생 생성 CTA (B-1)", () => {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const subjects = [{ id: "sub-1", name: "수학" }];
  const students = [{ id: "stu-1", name: "홍길동" }];
  const baseData: GroupSessionData = {
    studentIds: [],
    subjectId: "",
    weekday: 1,
    startTime: "10:00",
    endTime: "11:00",
    yPosition: 1,
    room: "",
  };

  function renderModal(overrides: Partial<Parameters<typeof GroupSessionModal>[0]> = {}) {
    const defaults = {
      isOpen: true,
      groupModalData: baseData,
      setGroupModalData: () => {},
      setShowGroupModal: () => {},
      removeStudent: () => {},
      studentInputValue: "이현진",
      setStudentInputValue: () => {},
      handleStudentInputKeyDown: () => {},
      addStudentFromInput: () => {},
      filteredStudentsForModal: [],
      addStudent: () => {},
      subjects,
      teachers: [],
      students,
      weekdays,
      handleStartTimeChange: () => {},
      handleEndTimeChange: () => {},
      groupTimeError: "",
      addGroupSession: () => {},
      onCreateStudent: () => {},
      studentCreating: false,
      studentCreateError: "",
    };
    return render(<GroupSessionModal {...defaults} {...overrides} />);
  }

  it("존재하지 않는 이름 입력 시 CTA 버튼이 렌더링된다", () => {
    renderModal({ filteredStudentsForModal: [] });
    expect(
      screen.getByText(/새 학생으로 추가/)
    ).toBeInTheDocument();
  });

  it("CTA 클릭 시 onCreateStudent가 호출된다", () => {
    const onCreateStudent = vi.fn();
    renderModal({ filteredStudentsForModal: [], onCreateStudent });
    fireEvent.click(screen.getByText(/새 학생으로 추가/));
    expect(onCreateStudent).toHaveBeenCalledTimes(1);
  });

  it("studentCreating=true일 때 CTA가 비활성화되고 '추가 중...' 라벨이 표시된다", () => {
    renderModal({ filteredStudentsForModal: [], studentCreating: true });
    const cta = screen.getByText("추가 중...") as HTMLButtonElement;
    expect(cta).toBeDisabled();
  });

  it("studentCreateError가 있을 때 에러 메시지가 렌더링된다", () => {
    renderModal({
      filteredStudentsForModal: [],
      studentCreateError: "이미 존재하는 이름입니다.",
    });
    expect(screen.getByText("이미 존재하는 이름입니다.")).toBeInTheDocument();
  });

  it("이미 선택에 있는 학생과 정확 일치하면 CTA 대신 '이미 추가된 학생입니다' 메시지가 표시된다", () => {
    renderModal({
      groupModalData: { ...baseData, studentIds: ["stu-1"] },
      studentInputValue: "홍길동",
      filteredStudentsForModal: [],
    });
    expect(screen.getByText("이미 추가된 학생입니다")).toBeInTheDocument();
    expect(screen.queryByText(/새 학생으로 추가/)).not.toBeInTheDocument();
  });

  it("canManage=false 이면 새 학생 CTA 대신 '일치하는 학생이 없습니다' 메시지가 표시된다", () => {
    renderModal({
      filteredStudentsForModal: [],
      studentInputValue: "이현진",
      canManage: false,
    });
    expect(screen.queryByText(/새 학생으로 추가/)).not.toBeInTheDocument();
    expect(screen.getByText("일치하는 학생이 없습니다")).toBeInTheDocument();
  });
});

describe("GroupSessionModal - list-first UX", () => {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const subjects = [{ id: "sub-1", name: "수학" }];
  const students = [
    { id: "stu-1", name: "홍길동" },
    { id: "stu-2", name: "김영희" },
  ];
  const baseData: GroupSessionData = {
    studentIds: [],
    subjectId: "",
    weekday: 1,
    startTime: "10:00",
    endTime: "11:00",
    yPosition: 1,
    room: "",
  };

  function renderModal(overrides: Partial<Parameters<typeof GroupSessionModal>[0]> = {}) {
    const defaults = {
      isOpen: true,
      groupModalData: baseData,
      setGroupModalData: () => {},
      setShowGroupModal: () => {},
      removeStudent: () => {},
      studentInputValue: "",
      setStudentInputValue: () => {},
      handleStudentInputKeyDown: () => {},
      addStudentFromInput: () => {},
      filteredStudentsForModal: students,
      addStudent: () => {},
      subjects,
      teachers: [],
      students,
      weekdays,
      handleStartTimeChange: () => {},
      handleEndTimeChange: () => {},
      groupTimeError: "",
      addGroupSession: () => {},
      onCreateStudent: () => {},
      studentCreating: false,
      studentCreateError: "",
    };
    return render(<GroupSessionModal {...defaults} {...overrides} />);
  }

  it("입력값이 비어 있어도 학생 목록이 보인다 (list-first)", () => {
    renderModal({ studentInputValue: "" });
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("김영희")).toBeInTheDocument();
  });

  it("학생 항목 클릭 시 addStudent가 호출된다", () => {
    const addStudent = vi.fn();
    renderModal({ studentInputValue: "", addStudent });
    fireEvent.click(screen.getByText("홍길동"));
    expect(addStudent).toHaveBeenCalledWith("stu-1");
  });
});

describe("GroupSessionModal - 강사·과목 인라인 추가", () => {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const subjects = [{ id: "sub-1", name: "수학" }];
  const students = [{ id: "stu-1", name: "홍길동" }];
  const baseData: GroupSessionData = {
    studentIds: ["stu-1"],
    subjectId: "",
    weekday: 1,
    startTime: "10:00",
    endTime: "11:00",
    yPosition: 1,
    room: "",
  };

  function renderAtStep1(
    overrides: Partial<Parameters<typeof GroupSessionModal>[0]> = {}
  ) {
    const defaults = {
      isOpen: true,
      groupModalData: baseData,
      setGroupModalData: () => {},
      setShowGroupModal: () => {},
      removeStudent: () => {},
      studentInputValue: "",
      setStudentInputValue: () => {},
      handleStudentInputKeyDown: () => {},
      addStudentFromInput: () => {},
      filteredStudentsForModal: [],
      addStudent: () => {},
      subjects,
      teachers: [],
      students,
      weekdays,
      handleStartTimeChange: () => {},
      handleEndTimeChange: () => {},
      groupTimeError: "",
      addGroupSession: () => {},
      onCreateStudent: () => {},
      studentCreating: false,
      studentCreateError: "",
    };
    const result = render(<GroupSessionModal {...defaults} {...overrides} />);
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    return result;
  }

  it("canManage=true 이면 과목 select 옆 '+' 버튼이 렌더된다", () => {
    renderAtStep1({ canManage: true });
    expect(
      screen.getByRole("button", { name: "새 과목 추가" })
    ).toBeInTheDocument();
  });

  it("canManage=false 이면 과목 '+' 버튼 미렌더", () => {
    renderAtStep1({ canManage: false });
    expect(
      screen.queryByRole("button", { name: "새 과목 추가" })
    ).not.toBeInTheDocument();
  });

  it("과목 '+' 클릭 시 인라인 row가 표시된다", () => {
    renderAtStep1({ canManage: true });
    fireEvent.click(screen.getByRole("button", { name: "새 과목 추가" }));
    expect(screen.getByPlaceholderText("새 과목 이름")).toBeInTheDocument();
  });

  it("과목 '생성' 클릭 시 onCreateSubject 호출", async () => {
    const onCreateSubject = vi.fn().mockResolvedValue(true);
    renderAtStep1({
      canManage: true,
      subjectInputValue: "국어",
      onCreateSubject,
    });
    fireEvent.click(screen.getByRole("button", { name: "새 과목 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "생성" }));
    expect(onCreateSubject).toHaveBeenCalledTimes(1);
  });

  it("subjectCreateError 있으면 에러 메시지 표시", () => {
    renderAtStep1({
      canManage: true,
      subjectInputValue: "수학",
      subjectCreateError: "이미 같은 이름의 과목이 존재합니다.",
    });
    fireEvent.click(screen.getByRole("button", { name: "새 과목 추가" }));
    expect(
      screen.getByText("이미 같은 이름의 과목이 존재합니다.")
    ).toBeInTheDocument();
  });

  it("canManage=true 이면 '+ 새 강사' pill이 렌더된다 (TeacherPillPicker 통합)", () => {
    renderAtStep1({
      canManage: true,
      teachers: [],
      teacherInputValue: "",
      setTeacherInputValue: () => {},
      onCreateTeacher: vi.fn().mockResolvedValue(true),
    });
    expect(
      screen.getByRole("button", { name: /＋ 새 강사/ })
    ).toBeInTheDocument();
  });
});
