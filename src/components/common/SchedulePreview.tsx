import { SUBJECT_PALETTE_HEX } from "@/lib/schedule/subjectColorPalette";
import type { SchedulePreviewProps } from "./SchedulePreview.types";
import SubjectChip from "./SubjectChip";

const DEFAULT_DAYS = ["월", "화", "수", "목", "금"];

export default function SchedulePreview({
  data,
  times,
  days = DEFAULT_DAYS,
  size = "sm",
}: SchedulePreviewProps) {
  const cellHeight = size === "sm" ? "h-10" : "h-14";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div
      data-surface="surface"
      data-testid="schedule-preview"
      className="rounded-admin-lg border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-3 shadow-admin-md"
    >
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((d) => (
          <div key={d} className={`${textSize} text-center font-medium text-[var(--color-text-secondary)] py-1`}>
            {d}
          </div>
        ))}

        {times.map((t, ti) => (
          <div key={t} className="contents">
            <div className={`${textSize} text-[var(--color-text-muted)] py-1 pr-2 text-right`}>{t}</div>
            {days.map((_, di) => {
              const cell = data.find((c) => c.day === di && c.timeIndex === ti);
              if (!cell) {
                return <div key={`${di}-${ti}`} className={`${cellHeight} rounded-[4px] bg-[var(--color-bg-tertiary)]`} />;
              }
              return (
                <div key={`${di}-${ti}`} className={`${cellHeight} flex items-stretch`}>
                  <SubjectChip
                    label={cell.subjectLabel}
                    subLabel={cell.studentLabel}
                    color={SUBJECT_PALETTE_HEX[cell.color]}
                    variant="fill"
                    size={size === "sm" ? "sm" : "md"}
                    className="!flex-col w-full h-full justify-center !items-start"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
