import { useState, useCallback, useEffect } from "react";
import type { ScheduleTemplate, RawTemplate, TemplateData } from "@/shared/types/templateTypes";
import { logger } from "@/lib/logger";

function mapTemplate(raw: RawTemplate): ScheduleTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    templateData: raw.template_data,
    slotIndex: raw.slot_index ?? 0,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * saveTemplate 결과.
 * - ok=true: 저장 성공
 * - ok=false + reason='quota_exceeded': free tier 슬롯 quota 초과 (HTTP 403)
 * - ok=false + reason='unknown': 그 외 fail
 *
 * caller (handleSaveTemplate) 가 reason 별 toast 메시지 분기 가능.
 */
export type SaveTemplateResult =
  | { ok: true }
  | { ok: false; reason: "quota_exceeded" | "unknown" };

export function useTemplates(userId: string | null) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/templates?userId=${userId}`);
      if (res.ok) {
        const { data } = await res.json();
        setTemplates((data ?? []).map(mapTemplate));
      }
    } catch (error) {
      logger.error(
        "템플릿 목록 조회 네트워크 오류",
        undefined,
        error as Error
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const saveTemplate = useCallback(
    async (payload: { name: string; description: string; templateData: TemplateData }): Promise<SaveTemplateResult> => {
      if (!userId) return { ok: false, reason: "unknown" };
      setIsSaving(true);
      try {
        const res = await fetch(`/api/templates?userId=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            description: payload.description || null,
            templateData: payload.templateData,
          }),
        });
        if (res.ok) {
          await fetchTemplates();
          return { ok: true };
        }
        // T2 (ADR-008): quota 초과 감지 — caller 가 "추후 업데이트 예정" 토스트 분기
        if (res.status === 403) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (json.error === "TEMPLATES_QUOTA_EXCEEDED") {
            logger.warn("템플릿 quota 초과", { userId });
            return { ok: false, reason: "quota_exceeded" };
          }
        }
        logger.error("템플릿 저장 실패 (서버 응답)", {
          status: res.status,
          statusText: res.statusText,
        });
        return { ok: false, reason: "unknown" };
      } catch (error) {
        logger.error(
          "템플릿 저장 네트워크 오류",
          undefined,
          error as Error
        );
        return { ok: false, reason: "unknown" };
      } finally {
        setIsSaving(false);
      }
    },
    [userId, fetchTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (!userId) return;
      await fetch(`/api/templates/${id}?userId=${userId}`, { method: "DELETE" });
      await fetchTemplates();
    },
    [userId, fetchTemplates]
  );

  const updateTemplate = useCallback(
    async (id: string, fields: { name?: string; description?: string; template_data?: TemplateData }) => {
      if (!userId) return null;
      setIsSaving(true);
      try {
        const res = await fetch(`/api/templates/${id}?userId=${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          logger.error("템플릿 갱신 실패 (서버 응답)", {
            id,
            status: res.status,
            statusText: res.statusText,
          });
          return null;
        }
        const json = await res.json();
        setTemplates((prev) => prev.map((t) => (t.id === id ? mapTemplate(json.data) : t)));
        return json.data;
      } catch (error) {
        logger.error(
          "템플릿 갱신 네트워크 오류",
          { id },
          error as Error
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  // userId 가 처음 들어오거나 바뀔 때 자동 동기화 — 새로고침 후에도 메뉴 활성 보장.
  useEffect(() => {
    if (userId) fetchTemplates();
  }, [userId, fetchTemplates]);

  // 가장 최근 1개 (API가 created_at DESC 정렬)
  const activeTemplate = templates.length > 0 ? templates[0] : null;

  return { templates, activeTemplate, isLoading, isSaving, fetchTemplates, saveTemplate, deleteTemplate, updateTemplate };
}
