import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataConflictModal from "../DataConflictModal";
import type { ClassPlannerData } from "../../../lib/localStorageCrud";

const makeData = (
  students: { id: string; name: string }[],
  subjects: { id: string; name: string; color?: string }[],
  sessions: { id: string; weekday: number; startsAt: string; endsAt: string; enrollmentIds?: string[] }[]
): ClassPlannerData => ({
  students,
  subjects,
  sessions,
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
});

const localData = makeData(
  [
    { id: "s1", name: "김철수" },
    { id: "s2", name: "이영희" },
    { id: "s3", name: "박민준" },
  ],
  [
    { id: "sub1", name: "피아노", color: "#f00" },
    { id: "default-1", name: "초등수학", color: "#fbbf24" },
  ],
  [{ id: "sess1", weekday: 0, startsAt: "09:00", endsAt: "10:00" }]
);

const serverData = makeData(
  [{ id: "ss1", name: "서버학생" }],
  [{ id: "ssub1", name: "미술", color: "#00f" }],
  []
);

describe("DataConflictModal", () => {
  it("로컬 카드에 학생 이름 목록이 렌더된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getAllByText("김철수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("이영희").length).toBeGreaterThan(0);
    expect(screen.getAllByText("박민준").length).toBeGreaterThan(0);
  });

  it("서버 카드에 서버 학생 이름이 렌더된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getByText("서버학생")).toBeInTheDocument();
  });

  it("디폴트 과목(초등수학 등)은 과목 목록에 표시되지 않는다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.queryByText("초등수학")).toBeNull();
    expect(screen.getAllByText("피아노").length).toBeGreaterThan(0);  // local subject
    expect(screen.getAllByText("미술").length).toBeGreaterThan(0);    // server subject
  });

  it("로컬 라디오 선택 후 확인 버튼 클릭 시 onSelectLocal 호출", () => {
    const onSelectLocal = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={onSelectLocal}
      />
    );
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]); // 로컬 라디오 선택
    fireEvent.click(screen.getByRole("button", { name: "선택한 데이터로 시작" }));
    expect(onSelectLocal).toHaveBeenCalledTimes(1);
  });

  it("서버 라디오 선택 후 확인 버튼 클릭 시 onSelectServer 호출", () => {
    const onSelectServer = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={vi.fn()}
      />
    );
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1]); // 서버 라디오 선택
    fireEvent.click(screen.getByRole("button", { name: "선택한 데이터로 시작" }));
    expect(onSelectServer).toHaveBeenCalledTimes(1);
  });

  it("라디오 미선택 시 확인 버튼이 비활성화된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "선택한 데이터로 시작" })).toBeDisabled();
  });

  it("backdrop 클릭해도 닫히지 않음", () => {
    const onSelectServer = vi.fn();
    const onSelectLocal = vi.fn();
    const { container } = render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={onSelectLocal}
      />
    );
    if (container.firstElementChild) {
      fireEvent.click(container.firstElementChild);
    }
    expect(onSelectServer).not.toHaveBeenCalled();
    expect(onSelectLocal).not.toHaveBeenCalled();
  });

  it("디폴트 과목만 있고 추가 과목이 없으면 과목 섹션에 항목 없음", () => {
    const onlyDefaultSubjects = makeData(
      [{ id: "s1", name: "김철수" }],
      [{ id: "default-1", name: "초등수학", color: "#fbbf24" }],
      []
    );
    render(
      <DataConflictModal
        localData={onlyDefaultSubjects}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.queryByText("초등수학")).toBeNull();
  });

  it("안내 배너가 렌더된다", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText(/선택한 데이터가 내 계정에 저장되며/)).toBeInTheDocument();
  });

  describe("SessionSection expand/collapse", () => {
    it("수업 개수가 표시된다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      // localData has 1 session, serverData has 0
      expect(screen.getAllByText("1개").length).toBeGreaterThan(0);
    });

    it("수업이 있을 때 펼치기 아이콘이 표시된다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      // ▶ icon visible for the local data card (1 session)
      expect(screen.getAllByText("▶").length).toBeGreaterThan(0);
    });

    it("수업 섹션 클릭 시 세션 목록이 펼쳐진다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      // Find the expand icon buttons (▶) — only local data card has sessions (1 session)
      const expandIcons = screen.getAllByText("▶");
      fireEvent.click(expandIcons[0]);
      // After expand, session detail should be shown: 월 09:00~10:00
      expect(screen.getAllByText("월 09:00~10:00").length).toBeGreaterThan(0);
    });

    it("수업 섹션 두 번 클릭 시 접힌다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      const expandIcons = screen.getAllByText("▶");
      fireEvent.click(expandIcons[0]);
      // Now expanded — should show ▼
      expect(screen.getAllByText("▼").length).toBeGreaterThan(0);
      const collapseIcons = screen.getAllByText("▼");
      fireEvent.click(collapseIcons[0]);
      // Now collapsed — ▶ should be back
      expect(screen.getAllByText("▶").length).toBeGreaterThan(0);
    });
  });

  describe("isMigrating prop", () => {
    it("isMigrating=true 시 로딩 오버레이가 렌더된다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
          isMigrating={true}
        />
      );
      expect(screen.getByText("데이터를 동기화하는 중...")).toBeInTheDocument();
    });

    it("isMigrating=false 시 로딩 오버레이가 렌더되지 않는다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
          isMigrating={false}
        />
      );
      expect(screen.queryByText("데이터를 동기화하는 중...")).toBeNull();
    });
  });

  describe("migrationError prop", () => {
    it("migrationError가 있으면 에러 배너와 다시 시도 버튼이 렌더된다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
          migrationError="동기화에 실패했습니다."
        />
      );
      expect(screen.getByText("동기화에 실패했습니다.")).toBeInTheDocument();
      expect(screen.getByText("다시 시도")).toBeInTheDocument();
    });

    it("다시 시도 버튼 클릭 시 onSelectLocal 호출", () => {
      const onSelectLocal = vi.fn();
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={onSelectLocal}
          migrationError="동기화에 실패했습니다."
        />
      );
      fireEvent.click(screen.getByText("다시 시도"));
      expect(onSelectLocal).toHaveBeenCalledTimes(1);
    });

    it("isMigrating=true 이면 에러 배너가 숨겨진다", () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
          isMigrating={true}
          migrationError="동기화에 실패했습니다."
        />
      );
      expect(screen.queryByText("동기화에 실패했습니다.")).toBeNull();
      expect(screen.getByText("데이터를 동기화하는 중...")).toBeInTheDocument();
    });
  });
});
