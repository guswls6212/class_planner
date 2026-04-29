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
  /** If provided, replaces subject.color when resolving the tone */
  overrideColor?: string;
  /** Dims the card to opacity 0.25 (non-matching student filter) */
  dimmed?: boolean;
  /** Adds a glow ring using overrideColor (matching student filter) */
  highlighted?: boolean;
}
