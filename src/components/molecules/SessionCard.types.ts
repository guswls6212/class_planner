import type React from "react";
import type { Subject } from "@/lib/planner";

export type SessionCardVariant = "block" | "row" | "chip" | "preview";

export type SessionCardState = "default" | "ongoing" | "done" | "conflict";

export type AttendanceStatus =
  | "all-present"
  | "partial"
  | "absent"
  | "unmarked";

export interface SessionCardProps {
  subject: Subject | null;
  studentNames?: string[];
  timeRange?: string;
  variant: SessionCardVariant;
  state?: SessionCardState;
  style?: React.CSSProperties;
  overlapCount?: number;
  overlapIndex?: number;
  onClick?: () => void;
  onAttendanceClick?: () => void;
  attendanceStatus?: AttendanceStatus;
  className?: string;
  "data-testid"?: string;
}
