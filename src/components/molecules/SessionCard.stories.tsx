import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionCard } from "./SessionCard";
import {
  FIXTURE_SUBJECT_MATH,
  FIXTURE_SUBJECT_ENGLISH,
} from "@/__tests__/fixtures/subject.fixture";

const meta = {
  title: "Molecules/SessionCard",
  component: SessionCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["block", "row", "chip", "preview"],
    },
    state: {
      control: "select",
      options: ["default", "ongoing", "done", "conflict"],
    },
    colorBy: {
      control: "select",
      options: ["subject", "student", "teacher"],
    },
  },
} satisfies Meta<typeof SessionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseSubject = { id: FIXTURE_SUBJECT_MATH.id, name: FIXTURE_SUBJECT_MATH.name, color: FIXTURE_SUBJECT_MATH.color };
const baseStudents = ["홍길동", "김영수"];

export const Block: Story = {
  args: {
    variant: "block",
    subject: baseSubject,
    studentNames: baseStudents,
    state: "default",
    style: { width: 180, height: 60 },
  },
};

export const BlockOngoing: Story = {
  args: {
    variant: "block",
    subject: baseSubject,
    studentNames: baseStudents,
    state: "ongoing",
    style: { width: 180, height: 60 },
  },
};

export const BlockConflict: Story = {
  args: {
    variant: "block",
    subject: baseSubject,
    studentNames: baseStudents,
    state: "conflict",
    style: { width: 180, height: 60 },
  },
};

export const BlockDone: Story = {
  args: {
    variant: "block",
    subject: baseSubject,
    studentNames: baseStudents,
    state: "done",
    style: { width: 180, height: 60 },
  },
};

export const BlockTeacherColored: Story = {
  args: {
    variant: "block",
    subject: { id: FIXTURE_SUBJECT_ENGLISH.id, name: FIXTURE_SUBJECT_ENGLISH.name, color: FIXTURE_SUBJECT_ENGLISH.color },
    studentNames: baseStudents,
    state: "default",
    colorBy: "teacher",
    teacherName: "김선생",
    overrideColor: "#FF6B6B",
    style: { width: 180, height: 60 },
  },
};

export const Row: Story = {
  args: {
    variant: "row",
    subject: baseSubject,
    studentNames: baseStudents,
    timeRange: "09:00",
    state: "default",
  },
};

export const RowWithAttendance: Story = {
  args: {
    variant: "row",
    subject: baseSubject,
    studentNames: baseStudents,
    timeRange: "10:00",
    onAttendanceClick: () => alert("출석 체크"),
    attendanceStatus: "all-present",
  },
};

export const RowAttendanceAbsent: Story = {
  args: {
    variant: "row",
    subject: baseSubject,
    studentNames: baseStudents,
    timeRange: "11:00",
    onAttendanceClick: () => alert("출석 체크"),
    attendanceStatus: "absent",
  },
};

export const RowDimmed: Story = {
  args: {
    variant: "row",
    subject: baseSubject,
    studentNames: baseStudents,
    timeRange: "14:00",
    dimmed: true,
  },
};

export const RowHighlighted: Story = {
  args: {
    variant: "row",
    subject: baseSubject,
    studentNames: baseStudents,
    timeRange: "15:00",
    highlighted: true,
    overrideColor: FIXTURE_SUBJECT_ENGLISH.color,
  },
};

export const Chip: Story = {
  args: {
    variant: "chip",
    subject: baseSubject,
  },
};

export const Preview: Story = {
  args: {
    variant: "preview",
    subject: baseSubject,
    studentNames: baseStudents,
    style: { width: 140, height: 50 },
  },
};
