import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DndContext } from "@dnd-kit/core";
import HiddenSessionsPopover from "./HiddenSessionsPopover";
import { FIXTURE_SUBJECTS } from "@/__tests__/fixtures/subject.fixture";
import { FIXTURE_STUDENTS } from "@/__tests__/fixtures/student.fixture";
import { FIXTURE_ENROLLMENTS } from "@/__tests__/fixtures/enrollment.fixture";
import {
  FIXTURE_SESSIONS,
  FIXTURE_SESSION_NORMAL,
} from "@/__tests__/fixtures/session.fixture";

const withDndContext = (Story: React.ComponentType) => (
  <DndContext>
    <div className="relative w-[400px] h-[400px] bg-[var(--color-bg-secondary)]">
      <Story />
    </div>
  </DndContext>
);

const meta = {
  title: "Molecules/HiddenSessionsPopover",
  component: HiddenSessionsPopover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [withDndContext],
} satisfies Meta<typeof HiddenSessionsPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleHidden: Story = {
  args: {
    hiddenSessions: [FIXTURE_SESSION_NORMAL],
    subjects: FIXTURE_SUBJECTS,
    enrollments: FIXTURE_ENROLLMENTS,
    students: FIXTURE_STUDENTS,
    anchorTop: 40,
    onClose: () => {},
    onExpandAll: () => alert("expand all"),
  },
};

export const MultipleHidden: Story = {
  args: {
    hiddenSessions: FIXTURE_SESSIONS.slice(0, 3),
    subjects: FIXTURE_SUBJECTS,
    enrollments: FIXTURE_ENROLLMENTS,
    students: FIXTURE_STUDENTS,
    anchorTop: 40,
    onClose: () => {},
    onExpandAll: () => alert("expand all"),
  },
};

export const ManyHidden: Story = {
  args: {
    hiddenSessions: FIXTURE_SESSIONS,
    subjects: FIXTURE_SUBJECTS,
    enrollments: FIXTURE_ENROLLMENTS,
    students: FIXTURE_STUDENTS,
    anchorTop: 40,
    onClose: () => {},
    onExpandAll: () => alert("expand all"),
  },
};
