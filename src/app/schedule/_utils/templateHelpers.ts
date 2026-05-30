/**
 * Schedule 의 template apply/save helper utils.
 *
 * 기존: schedule/page.tsx 의 doApplyTemplate (78 줄) + handleSaveSlot (57 줄) 의 logic 이
 * inline. dependency 다수 — sessions / subjects / students / teachers / enrollments /
 * updateData / templates / saveTemplate / updateTemplate / weekFilteredSessions /
 * currentWeekStart / showToast / setIsApplyingTemplate.
 *
 * 본 utils: **pure function** 으로 logic 만 — page 는 state setter + toast 호출 orchestration.
 *
 * Sub-proposal: schedule-page-split-refactor PR 5 (utils 패턴 큰 효과 검증).
 */

import type { Session, Subject } from "@/lib/planner";
import type { ScheduleTemplate, TemplateData } from "@/shared/types/templateTypes";
import { buildApplyTemplatePayload } from "./buildApplyTemplate";
import { repositionSessions as repositionSessionsUtil } from "@/lib/sessionCollisionUtils";
import {
  syncSessionCreate,
  syncEnrollmentCreate,
} from "@/lib/apiSync";

export interface ApplyTemplateSuccess {
  ok: true;
  newSessionsCount: number;
  missingEntities: string[];
}
export interface ApplyTemplateFailure {
  ok: false;
  error: string;
}

export async function applyTemplateUtil(params: {
  template: ScheduleTemplate;
  weekFilteredSessions: Session[];
  sessions: Session[];
  subjects: Subject[];
  students: Array<{ id: string; name: string }>;
  teachers: Array<{ id: string; name: string; color: string }>;
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  currentWeekStart: string;
  updateData: (payload: Record<string, unknown>) => Promise<unknown>;
}): Promise<ApplyTemplateSuccess | ApplyTemplateFailure> {
  try {
    const {
      newSessions,
      newEnrollments: newEnrollmentsLocal,
      missingEntities,
    } = buildApplyTemplatePayload(params.template, {
      subjects: params.subjects,
      students: params.students,
      teachers: params.teachers,
      enrollments: params.enrollments,
      weekStartDate: params.currentWeekStart,
    });

    const survivingSessions = params.sessions.filter(
      (s) => !params.weekFilteredSessions.some((w) => w.id === s.id),
    );
    const mergedEnrollments =
      newEnrollmentsLocal.length > 0
        ? [...params.enrollments, ...newEnrollmentsLocal]
        : params.enrollments;

    let mergedSessions: Session[] = [...survivingSessions, ...newSessions];
    for (const ns of newSessions) {
      mergedSessions = repositionSessionsUtil(
        mergedSessions,
        mergedEnrollments,
        params.subjects,
        ns.weekday,
        ns.startsAt,
        ns.endsAt,
        ns.yPosition ?? 1,
        ns.id,
      );
    }

    const updatePayload: Record<string, unknown> = { sessions: mergedSessions };
    if (newEnrollmentsLocal.length > 0) {
      updatePayload.enrollments = mergedEnrollments;
    }
    await params.updateData(updatePayload);

    // server 동기화 (fire-and-forget) — client UUID 포함 (ghost 방지)
    const uid = localStorage.getItem("supabase_user_id");
    for (const ne of newEnrollmentsLocal) {
      syncEnrollmentCreate(uid, ne);
    }
    for (const ns of newSessions) {
      syncSessionCreate(uid, ns);
    }

    return {
      ok: true,
      newSessionsCount: newSessions.length,
      missingEntities,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type SaveTemplateSlotResult =
  | { ok: true; action: "create" | "update"; name: string }
  | { ok: false; reason: "empty" | "quota" | "error" };

export async function saveTemplateSlotUtil(params: {
  slotIndex: number;
  userName?: string;
  templateData: TemplateData;
  templates: ScheduleTemplate[];
  saveTemplate: (input: {
    name: string;
    description: string;
    templateData: TemplateData;
  }) => Promise<{ ok: true } | { ok: false; reason?: string }>;
  updateTemplate: (
    id: string,
    input: { name: string; template_data: TemplateData },
  ) => Promise<unknown>;
}): Promise<SaveTemplateSlotResult> {
  if (params.templateData.sessions.length === 0) {
    return { ok: false, reason: "empty" };
  }
  const finalName = params.userName ?? `슬롯 ${params.slotIndex + 1}`;
  const existing = params.templates.find((t) => t.slotIndex === params.slotIndex);

  if (existing) {
    const result = await params.updateTemplate(existing.id, {
      name: finalName,
      template_data: params.templateData,
    });
    if (!result) return { ok: false, reason: "error" };
    return { ok: true, action: "update", name: finalName };
  }

  const result = await params.saveTemplate({
    name: finalName,
    description: "",
    templateData: params.templateData,
  });
  if (!result.ok) {
    if (result.reason === "quota_exceeded") return { ok: false, reason: "quota" };
    return { ok: false, reason: "error" };
  }
  return { ok: true, action: "create", name: finalName };
}
