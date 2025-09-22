import { fireEvent, render } from "@testing-library/react";
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

  it("updates subjectId, weekday and room via setGroupModalData on change", () => {
    const initial: GroupSessionData = {
      studentIds: ["stu-1"],
      subjectId: "",
      weekday: 1,
      startTime: "10:00",
      endTime: "11:00",
      yPosition: 1,
      room: "",
    };

    const controller = createStateController(initial);

    const { getByLabelText } = render(
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
        students={students}
        weekdays={weekdays}
        handleStartTimeChange={() => {}}
        handleEndTimeChange={() => {}}
        groupTimeError=""
        addGroupSession={() => {}}
      />
    );

    // 과목 선택 변경
    const subjectSelect = getByLabelText("과목") as HTMLSelectElement;
    fireEvent.change(subjectSelect, { target: { value: "sub-1" } });
    expect(controller.get().subjectId).toBe("sub-1");

    // 요일 변경
    const weekdaySelect = getByLabelText("요일") as HTMLSelectElement;
    fireEvent.change(weekdaySelect, { target: { value: "2" } });
    expect(controller.get().weekday).toBe(2);

    // 강의실 입력 변경
    const roomInput = getByLabelText("강의실") as HTMLInputElement;
    fireEvent.change(roomInput, { target: { value: "A-101" } });
    expect(controller.get().room).toBe("A-101");
  });
});
