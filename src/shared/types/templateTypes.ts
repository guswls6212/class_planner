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
  /** ADR-008: free tier 의 academy 당 슬롯 index (0 또는 1). 향후 paywall 도입 시 확장. */
  slotIndex: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawTemplate {
  id: string;
  name: string;
  description: string | null;
  template_data: TemplateData;
  slot_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
