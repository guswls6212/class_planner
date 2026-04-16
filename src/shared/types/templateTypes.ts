export interface TemplateSessionDef {
  weekday: number;        // 0-6 (Mon=0)
  startsAt: string;       // "HH:MM"
  endsAt: string;         // "HH:MM"
  subjectName: string;
  subjectColor: string;
  studentNames: string[];
  teacherName?: string;
}

export interface TemplateData {
  version: "1.0";
  sessions: TemplateSessionDef[];
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  templateData: TemplateData;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawTemplate {
  id: string;
  name: string;
  description: string | null;
  template_data: TemplateData;
  created_by: string;
  created_at: string;
  updated_at: string;
}
