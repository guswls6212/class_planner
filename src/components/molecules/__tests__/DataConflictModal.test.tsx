import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataConflictModal from "../DataConflictModal";
import type { ClassPlannerData } from "../../../lib/localStorageCrud";

const makeData = (
  students: { id: string; name: string; gender?: string; birthDate?: string }[],
  subjects: { id: string; name: string; color?: string }[],
  sessions: { id: string; weekday: number; startsAt: string; endsAt: string; enrollmentIds?: string[] }[]
): ClassPlannerData => ({
  students,
  subjects,
  sessions,
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
});

const localData = makeData(
  [
    { id: "s1", name: "김철수", gender: "male", birthDate: "2010-03-15" },
    { id: "s2", name: "이영희", gender: "female" },
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
  it("로컬 카드에 학생 정보가 렌더된다 (접기/펼치기, 이름+성별+생년월일)", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    // 초기 상태: 접힌 상태 — 이름이 보이지 않음
    expect(screen.queryByText("김철수")).toBeNull();
    // 학생 섹션 펼치기 (학생 3명 라벨 클릭)
    const studentLabels = screen.getAllByText("3명");
    fireEvent.click(studentLabels[0]);
    expect(screen.getAllByText("김철수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("이영희").length).toBeGreaterThan(0);
    expect(screen.getAllByText("박민준").length).toBeGreaterThan(0);
  });

  it("서버 카드에 서버 학생 이름이 렌더된다 (접기/펼치기)", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    // 서버 카드의 학생 섹션 펼치기
    const studentLabels = screen.getAllByText("1명");
    fireEvent.click(studentLabels[0]);
    expect(screen.getByText("서버학생")).toBeInTheDocument();
  });

  it("과목 섹션 펼치면 사용자 추가 과목이 보이고 기본 과목은 힌트로 표시", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    // 로컬 카드의 과목 섹션 펼치기
    const subjectLabels = screen.getAllByText("2개");
    fireEvent.click(subjectLabels[0]);
    expect(screen.getAllByText("피아노").length).toBeGreaterThan(0);
    // 기본 과목은 힌트 텍스트로 표시
    expect(screen.getByText(/기본 과목 1개/)).toBeInTheDocument();
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
      // Find the expand icon buttons (▶) — all sections start collapsed
      const expandIcons = screen.getAllByText("▶");
      // 수업 섹션의 ▶ 클릭 (학생/과목/수업 순서이므로 마지막)
      fireEvent.click(expandIcons[expandIcons.length - 1]);
      // After expand, session detail should be shown with separate weekday and time spans
      expect(screen.getAllByText("월").length).toBeGreaterThan(0);
      expect(screen.getAllByText("09:00~10:00").length).toBeGreaterThan(0);
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

  describe("접근성 (a11y)", () => {
    it('role="dialog"가 존재한다', () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it('aria-modal="true"가 존재한다', () => {
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={vi.fn()}
          onSelectLocal={vi.fn()}
        />
      );
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("Escape 키 입력 시 모달이 닫히지 않는다 (강제 해결 모달)", () => {
      const onSelectServer = vi.fn();
      const onSelectLocal = vi.fn();
      render(
        <DataConflictModal
          localData={localData}
          serverData={serverData}
          onSelectServer={onSelectServer}
          onSelectLocal={onSelectLocal}
        />
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onSelectServer).not.toHaveBeenCalled();
      expect(onSelectLocal).not.toHaveBeenCalled();
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
