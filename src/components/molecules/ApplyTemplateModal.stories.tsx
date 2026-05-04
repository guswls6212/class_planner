import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ApplyTemplateModal from "./ApplyTemplateModal";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";
import {
  FIXTURE_TEMPLATE,
  FIXTURE_TEMPLATE_SESSION,
} from "@/__tests__/fixtures/template.fixture";

const meta: Meta<typeof ApplyTemplateModal> = {
  title: "molecules/ApplyTemplateModal",
  component: ApplyTemplateModal,
  parameters: {
    layout: "centered",
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onApply: fn(),
    isApplying: false,
    isLoading: false,
  },
};

export default meta;

type Story = StoryObj<typeof ApplyTemplateModal>;

const multiSessionTemplate: ScheduleTemplate = {
  ...FIXTURE_TEMPLATE,
  id: "tpl-13",
  name: "주간 13수업 커리큘럼",
  description: "월~금 정기 + 주말 보강",
  templateData: {
    version: "1.0",
    sessions: Array.from({ length: 13 }, (_, i) => ({
      ...FIXTURE_TEMPLATE_SESSION,
      weekday: i % 7,
    })),
  },
};

const teacherlessTemplate: ScheduleTemplate = {
  ...FIXTURE_TEMPLATE,
  id: "tpl-legacy",
  name: "(레거시) 강사 없는 템플릿",
  description: "PR #211 이전에 저장된 템플릿 호환성 테스트",
  templateData: {
    version: "1.0",
    sessions: [
      {
        weekday: 0,
        startsAt: "09:00",
        endsAt: "10:00",
        subjectId: "sub-1",
        subjectName: "수학",
        subjectColor: "#7DD3FC",
        studentIds: ["st-1"],
        studentNames: ["홍길동"],
      },
    ],
  },
};

export const SingleTemplate: Story = {
  name: "템플릿 1개",
  args: { templates: [FIXTURE_TEMPLATE] },
};

export const MultipleTemplates: Story = {
  name: "템플릿 여러 개 (1개 활성 정책 회귀 가드)",
  args: { templates: [FIXTURE_TEMPLATE, multiSessionTemplate, teacherlessTemplate] },
};

export const Empty: Story = {
  name: "빈 목록 — '저장된 템플릿이 없습니다'",
  args: { templates: [] },
};

export const Loading: Story = {
  name: "로딩 중",
  args: { templates: [], isLoading: true },
};

export const Applying: Story = {
  name: "적용 중 — 버튼 disabled",
  args: { templates: [FIXTURE_TEMPLATE], isApplying: true },
};

export const Closed: Story = {
  name: "닫힘 (isOpen=false)",
  args: { templates: [FIXTURE_TEMPLATE], isOpen: false },
};
