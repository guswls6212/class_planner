export type PreviewSubjectColor =
  | "blue" | "red" | "violet" | "emerald"
  | "amber" | "pink" | "teal" | "orange";

export interface PreviewCell {
  day: 0 | 1 | 2 | 3 | 4;
  timeIndex: number;
  subjectLabel: string;
  studentLabel?: string;
  color: PreviewSubjectColor;
}

export interface SchedulePreviewProps {
  data: PreviewCell[];
  times: string[];
  days?: string[];
  size?: "sm" | "md";
}
