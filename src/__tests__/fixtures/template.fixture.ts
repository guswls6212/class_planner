import type {
  TemplateSessionDef,
  TemplateData,
  ScheduleTemplate,
  RawTemplate,
} from "@/shared/types/templateTypes";

type FullTemplateSession = Required<
  Omit<TemplateSessionDef, "room" | "yPosition">
>;

export const FIXTURE_TEMPLATE_SESSION: FullTemplateSession = {
  weekday: 0,
  startsAt: "09:00",
  endsAt: "10:00",
  subjectId: "sub-1",
  subjectName: "수학",
  subjectColor: "#FF0000",
  studentIds: ["st-1"],
  studentNames: ["홍길동"],
  teacherId: "tc-1",
  teacherName: "김선생",
};

export const FIXTURE_TEMPLATE_SESSION_NO_TEACHER: Required<
  Omit<TemplateSessionDef, "room" | "yPosition" | "teacherId" | "teacherName">
> = {
  weekday: 1,
  startsAt: "11:00",
  endsAt: "12:00",
  subjectId: "sub-2",
  subjectName: "영어",
  subjectColor: "#00FF00",
  studentIds: ["st-2"],
  studentNames: ["김영수"],
};

export const FIXTURE_TEMPLATE_DATA: TemplateData = {
  version: "1.0",
  sessions: [FIXTURE_TEMPLATE_SESSION],
};

export const FIXTURE_TEMPLATE: ScheduleTemplate = {
  id: "tpl-1",
  name: "테스트 템플릿",
  description: "강사 포함 템플릿",
  templateData: FIXTURE_TEMPLATE_DATA,
  slotIndex: 0,
  createdBy: "user-1",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

export const FIXTURE_RAW_TEMPLATE: RawTemplate = {
  id: FIXTURE_TEMPLATE.id,
  name: FIXTURE_TEMPLATE.name,
  description: FIXTURE_TEMPLATE.description,
  template_data: FIXTURE_TEMPLATE_DATA,
  slot_index: 0,
  created_by: FIXTURE_TEMPLATE.createdBy,
  created_at: FIXTURE_TEMPLATE.createdAt,
  updated_at: FIXTURE_TEMPLATE.updatedAt,
};
