export interface TemplateSessionDef {
  weekday: number;        // 0-6 (Mon=0)
  startsAt: string;       // "HH:MM"
  endsAt: string;         // "HH:MM"
  subjectId: string;      // id 기반 매칭
  subjectName: string;    // 표시/경고용
  subjectColor: string;   // 표시용
  studentIds: string[];   // id 기반 매칭
  studentNames: string[]; // 표시/경고용 (studentIds와 동일 순서)
  teacherId?: string;     // id 기반 매칭
  teacherName?: string;   // 표시/경고용
  room?: string;
  yPosition?: number;
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
