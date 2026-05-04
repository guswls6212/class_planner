import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import SaveTemplateModal from "./SaveTemplateModal";
import type {
  TemplateData,
  TemplateSessionDef,
} from "@/shared/types/templateTypes";
import { FIXTURE_TEMPLATE_SESSION } from "@/__tests__/fixtures/template.fixture";

const meta: Meta<typeof SaveTemplateModal> = {
  title: "molecules/SaveTemplateModal",
  component: SaveTemplateModal,
  parameters: {
    layout: "centered",
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onSave: fn(),
    isSaving: false,
  },
};

export default meta;

type Story = StoryObj<typeof SaveTemplateModal>;

const buildSessions = (count: number): TemplateSessionDef[] =>
  Array.from({ length: count }, (_, i) => ({
    ...FIXTURE_TEMPLATE_SESSION,
    weekday: i % 7,
    startsAt: `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
    endsAt: `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
  }));

const data = (count: number): TemplateData => ({
  version: "1.0",
  sessions: buildSessions(count),
});

export const SingleSession: Story = {
  name: "1개 수업",
  args: { templateData: data(1) },
};

export const ThirteenSessions: Story = {
  name: "13개 수업 (사용자 시나리오)",
  args: { templateData: data(13) },
};

export const NoSessions: Story = {
  name: "0개 (저장 막힘)",
  args: { templateData: data(0) },
};

export const Saving: Story = {
  name: "저장 중 — 버튼 disabled",
  args: { templateData: data(13), isSaving: true },
};

export const Closed: Story = {
  name: "닫힘 (isOpen=false)",
  args: { templateData: data(13), isOpen: false },
};
