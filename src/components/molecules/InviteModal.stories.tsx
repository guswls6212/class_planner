import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import InviteModal from "./InviteModal";

const meta = {
  title: "Molecules/InviteModal",
  component: InviteModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InviteModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    userId: "story-user",
    onClose: () => {},
  },
};

export const PreSelectedTeacher: Story = {
  args: {
    isOpen: true,
    userId: "story-user",
    onClose: () => {},
    defaultTeacherId: "tc-pre-1",
    defaultTeacherName: "김선생",
  },
  parameters: {
    docs: {
      description: { story: "settings 페이지에서 특정 강사 row에서 열린 경우 — role/dropdown UI skip" },
    },
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    userId: "story-user",
    onClose: () => {},
  },
};

export const InvitePreSelectedAdmin: Story = {
  args: {
    isOpen: true,
    userId: "story-user",
    onClose: () => {},
    defaultTeacherName: "이매니저",
    defaultTeacherId: "tc-admin",
  },
};
