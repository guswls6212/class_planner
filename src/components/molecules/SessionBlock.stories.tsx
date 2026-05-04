import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DndContext } from "@dnd-kit/core";
import SessionBlock from "./SessionBlock";
import { FIXTURE_SUBJECTS } from "@/__tests__/fixtures/subject.fixture";
import { FIXTURE_STUDENTS } from "@/__tests__/fixtures/student.fixture";
import { FIXTURE_ENROLLMENTS } from "@/__tests__/fixtures/enrollment.fixture";
import { FIXTURE_TEACHERS } from "@/__tests__/fixtures/teacher.fixture";
import {
  FIXTURE_SESSION_NORMAL,
  FIXTURE_SESSION_GROUP,
  FIXTURE_SESSION_NO_TEACHER,
} from "@/__tests__/fixtures/session.fixture";

/**
 * SessionBlock은 useDraggable(@dnd-kit/core) 사용 — Storybook에서 DndContext로 wrap.
 * left/width/yOffset은 schedule 그리드 안에서 계산되는 값 — 여기선 시각만 위해 hardcode.
 */
const withDndContext = (Story: React.ComponentType) => (
  <DndContext>
    <div className="relative w-[640px] h-[200px] bg-[var(--color-bg-secondary)] p-4">
      <Story />
    </div>
  </DndContext>
);

const meta = {
  title: "Molecules/SessionBlock",
  component: SessionBlock,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [withDndContext],
} satisfies Meta<typeof SessionBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseProps = {
  subjects: FIXTURE_SUBJECTS,
  students: FIXTURE_STUDENTS,
  enrollments: FIXTURE_ENROLLMENTS,
  teachers: FIXTURE_TEACHERS,
  left: 40,
  width: 180,
  yOffset: 20,
  yPosition: 1,
  height: 60,
  onClick: () => alert("session clicked"),
};

export const Normal: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
  },
};

export const GroupSession: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_GROUP,
    width: 220,
    height: 80,
  },
};

export const NoTeacher: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NO_TEACHER,
  },
};

export const Conflict: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
    hasConflict: true,
  },
};

export const Selected: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
    selected: true,
  },
};

export const ColorByTeacher: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
    colorBy: "teacher",
  },
};

export const ReadOnly: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
    isReadOnly: true,
  },
};

export const Mobile: Story = {
  args: {
    ...baseProps,
    session: FIXTURE_SESSION_NORMAL,
    isMobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};
