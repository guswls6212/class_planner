import { useState, useCallback } from "react";
import type { ScheduleTemplate, RawTemplate, TemplateData } from "@/shared/types/templateTypes";

function mapTemplate(raw: RawTemplate): ScheduleTemplate {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    templateData: raw.template_data,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

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
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const saveTemplate = useCallback(
    async (payload: { name: string; description: string; templateData: TemplateData }) => {
      if (!userId) return false;
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
          return true;
        }
        return false;
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

  return { templates, isLoading, isSaving, fetchTemplates, saveTemplate, deleteTemplate };
}
