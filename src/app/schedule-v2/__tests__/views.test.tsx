/**
 * schedule-v2 뷰(그리드/학생별 표) + 그리드 유틸 테스트.
 * 순수 함수(레인 패킹/축)는 결정적 — flaky 요소 없음.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StudyRoomGrid from "../_components/StudyRoomGrid";
import StudyRoomTable from "../_components/StudyRoomTable";
import { dayGridBlocks, gridAxis, SAMPLE_STUDENTS } from "../_data/sampleSchedule";

describe("schedule-v2 views", () => {
  it("그리드가 에러 없이 렌더되고 요일·강사를 보여준다", () => {
    render(<StudyRoomGrid />);
    expect(screen.getByText("월")).toBeTruthy();
    expect(screen.getByText("금")).toBeTruthy();
    expect(screen.getAllByText("김쌤").length).toBeGreaterThan(0);
  });

  it("학생별 표가 학생들을 보여준다(주말 학생 포함)", () => {
    render(<StudyRoomTable />);
    expect(screen.getByText("김민준")).toBeTruthy();
    expect(screen.getByText("남도현")).toBeTruthy();
  });
});

describe("그리드 유틸", () => {
  it("레인 패킹: 같은 레인 블록은 시간이 겹치지 않는다", () => {
    const { blocks, lanes } = dayGridBlocks(SAMPLE_STUDENTS, "월", null);
    expect(blocks.length).toBeGreaterThan(0);
    expect(lanes).toBeGreaterThan(1); // 월요일 동시 수업 다수
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (blocks[i].lane === blocks[j].lane) {
          expect(blocks[i].end <= blocks[j].start || blocks[j].end <= blocks[i].start).toBe(true);
        }
      }
    }
  });

  it("강사 필터가 해당 강사 과목만 남긴다", () => {
    const { blocks } = dayGridBlocks(SAMPLE_STUDENTS, "월", "이쌤"); // 이쌤 = 영어
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => b.subj === "영어")).toBe(true);
  });

  it("gridAxis가 정시로 라운딩된 유효 범위를 준다", () => {
    const axis = gridAxis(SAMPLE_STUDENTS, null);
    expect(axis.start % 60).toBe(0);
    expect(axis.end % 60).toBe(0);
    expect(axis.end).toBeGreaterThan(axis.start);
  });
});
