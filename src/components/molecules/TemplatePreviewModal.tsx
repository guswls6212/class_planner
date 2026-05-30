"use client";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

interface TemplateSession {
  weekday: number;
  startsAt: string;
  endsAt: string;
  subjectName: string;
  studentNames: string[];
}

interface Props {
  template: {
    name: string;
    template_data: {
      sessions: TemplateSession[];
    };
  };
  onClose: () => void;
}

export function TemplatePreviewModal({ template, onClose }: Props) {
  const sessions = template.template_data.sessions ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5 w-[480px] max-w-[90vw] max-h-[80vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{template.name}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{sessions.length}개 수업</p>
        <ul className="space-y-2">
          {sessions
            .slice()
            .sort((a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt))
            .map((s, i) => (
              <li
                key={i}
                className="flex justify-between items-start gap-3 p-2 bg-[var(--color-bg-secondary)] rounded"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {WEEKDAYS[s.weekday]} {s.startsAt}–{s.endsAt}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{s.subjectName}</div>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] text-right">
                  {s.studentNames.join(", ")}
                </div>
              </li>
            ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-[var(--color-border)] text-sm rounded-md hover:bg-[var(--color-bg-secondary)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
