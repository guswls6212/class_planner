"use client";

import React from "react";
import Button from "../atoms/Button";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface AttendanceRecord {
  status: string;
  notes?: string | null;
}

interface Student {
  id: string;
  name: string;
}

interface AttendanceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  date: string;
  students: Student[];
  attendance: Record<string, AttendanceRecord>;
  onMarkAttendance: (studentId: string, status: AttendanceStatus) => void;
  onMarkAllPresent: () => void;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "출석",
  absent: "결석",
  late: "지각",
  excused: "사유",
};

const STATUS_LIST: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export default function AttendanceSheet({
  isOpen,
  onClose,
  date,
  students,
  attendance,
  onMarkAttendance,
  onMarkAllPresent,
}: AttendanceSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-black/40 md:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-[--color-bg-primary] md:rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--color-border]">
          <div>
            <h2 className="text-base font-semibold text-[--color-text-primary]">출석 체크</h2>
            <p className="text-xs text-[--color-text-tertiary] mt-0.5">{date}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="small" onClick={onMarkAllPresent}>
              전체 출석
            </Button>
            <button
              aria-label="닫기"
              className="p-1.5 rounded-lg text-[--color-text-secondary] hover:bg-[--color-bg-secondary] transition-colors"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Student list */}
        <div className="overflow-y-auto max-h-[60vh] divide-y divide-[--color-border]">
          {students.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[--color-text-tertiary]">
              등록된 학생이 없습니다.
            </p>
          ) : (
            students.map((student) => {
              const current = attendance[student.id]?.status as AttendanceStatus | undefined;
              return (
                <div key={student.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <span className="text-sm font-medium text-[--color-text-primary] min-w-[60px]">
                    {student.name}
                  </span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {STATUS_LIST.map((status) => (
                      <button
                        key={status}
                        aria-label={STATUS_LABELS[status]}
                        aria-pressed={current === status}
                        className={[
                          "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                          current === status
                            ? "bg-[--color-primary] text-white border-[--color-primary]"
                            : "bg-transparent text-[--color-text-secondary] border-[--color-border] hover:border-[--color-primary] hover:text-[--color-primary]",
                        ].join(" ")}
                        onClick={() => onMarkAttendance(student.id, status)}
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
