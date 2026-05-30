import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TemplatePreviewModal } from "../TemplatePreviewModal";

describe("TemplatePreviewModal", () => {
  it("템플릿 이름과 세션 수, 학생 목록 표시", () => {
    const template = {
      name: "기본 시간표",
      template_data: {
        sessions: [
          { weekday: 0, startsAt: "10:00", endsAt: "11:00", subjectName: "수학", studentNames: ["김철수"] },
          { weekday: 2, startsAt: "14:00", endsAt: "15:00", subjectName: "영어", studentNames: ["이영희"] },
        ],
      },
    };
    render(<TemplatePreviewModal template={template} onClose={vi.fn()} />);
    expect(screen.getByText("기본 시간표")).toBeInTheDocument();
    expect(screen.getByText(/2개 수업/)).toBeInTheDocument();
    expect(screen.getByText("수학")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
  });
});
