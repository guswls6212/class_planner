import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DataConflictModal from "./DataConflictModal";
import type { ClassPlannerData } from "@/lib/localStorageCrud";
import {
  FIXTURE_STUDENTS,
} from "@/__tests__/fixtures/student.fixture";
import {
  FIXTURE_SUBJECTS,
} from "@/__tests__/fixtures/subject.fixture";
import {
  FIXTURE_ENROLLMENTS,
} from "@/__tests__/fixtures/enrollment.fixture";
import {
  FIXTURE_SESSIONS,
} from "@/__tests__/fixtures/session.fixture";
import { FIXTURE_TEACHERS } from "@/__tests__/fixtures/teacher.fixture";

const localData: ClassPlannerData = {
  students: FIXTURE_STUDENTS,
  subjects: FIXTURE_SUBJECTS,
  sessions: FIXTURE_SESSIONS.slice(0, 2),
  enrollments: FIXTURE_ENROLLMENTS.slice(0, 2),
  teachers: FIXTURE_TEACHERS.slice(0, 1),
  version: "1.0",
  lastModified: "2026-05-04T10:00:00.000Z",
};

const serverData: ClassPlannerData = {
  students: FIXTURE_STUDENTS.slice(0, 2),
  subjects: FIXTURE_SUBJECTS.slice(0, 1),
  sessions: FIXTURE_SESSIONS.slice(2, 5),
  enrollments: FIXTURE_ENROLLMENTS.slice(1, 4),
  teachers: FIXTURE_TEACHERS.slice(0, 2),
  version: "1.0",
  lastModified: "2026-05-04T11:30:00.000Z",
};

const emptyData: ClassPlannerData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  teachers: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const meta = {
  title: "Molecules/DataConflictModal",
  component: DataConflictModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DataConflictModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BothPopulated: Story = {
  args: {
    localData,
    serverData,
    onSelectLocal: () => alert("로컬 선택"),
    onSelectServer: () => alert("서버 선택"),
  },
};

export const ServerEmpty: Story = {
  args: {
    localData,
    serverData: emptyData,
    onSelectLocal: () => {},
    onSelectServer: () => {},
  },
  parameters: {
    docs: {
      description: { story: "신규 사용자가 처음 로그인 — 서버 비어있고 로컬에 데이터" },
    },
  },
};

export const LocalEmpty: Story = {
  args: {
    localData: emptyData,
    serverData,
    onSelectLocal: () => {},
    onSelectServer: () => {},
  },
};

export const Migrating: Story = {
  args: {
    localData,
    serverData,
    onSelectLocal: () => {},
    onSelectServer: () => {},
    isMigrating: true,
  },
};

export const MigrationError: Story = {
  args: {
    localData,
    serverData,
    onSelectLocal: () => {},
    onSelectServer: () => {},
    migrationError: "네트워크 연결을 확인해주세요. 다시 시도해주세요.",
  },
};
