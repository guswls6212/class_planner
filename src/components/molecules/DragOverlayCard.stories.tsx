import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DragOverlayCard from "./DragOverlayCard";
import { FIXTURE_SESSION_NORMAL } from "@/__tests__/fixtures/session.fixture";
import { FIXTURE_SUBJECTS } from "@/__tests__/fixtures/subject.fixture";

const meta = {
  title: "Molecules/DragOverlayCard",
  component: DragOverlayCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DragOverlayCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleMove: Story = {
  args: {
    session: FIXTURE_SESSION_NORMAL,
    subjects: FIXTURE_SUBJECTS,
    isCopy: false,
    selectionCount: 1,
  },
};

export const SingleCopy: Story = {
  args: {
    session: FIXTURE_SESSION_NORMAL,
    subjects: FIXTURE_SUBJECTS,
    isCopy: true,
    selectionCount: 1,
  },
};

export const MultiMove: Story = {
  args: {
    session: FIXTURE_SESSION_NORMAL,
    subjects: FIXTURE_SUBJECTS,
    isCopy: false,
    selectionCount: 3,
  },
};

export const MultiCopy: Story = {
  args: {
    session: FIXTURE_SESSION_NORMAL,
    subjects: FIXTURE_SUBJECTS,
    isCopy: true,
    selectionCount: 5,
  },
};
