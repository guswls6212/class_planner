"use client";

import React from "react";
import { Button } from "../atoms/Button";

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

export interface Member {
  userId: string;
  role: string;
  email: string | null;
  name: string | null;
  joinedAt: string;
  linkedTeacherId: string | null;
  linkedTeacherName: string | null;
  linkedTeacherColor: string | null;
}

interface MemberListItemProps {
  member: Member;
  myRole: string;
  userId: string;
  onRemove: (userId: string) => void;
}

export default function MemberListItem({
  member,
  myRole,
  userId,
  onRemove,
}: MemberListItemProps) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-bg-primary)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium text-[var(--color-text-primary)]">
              {member.name || member.email || member.userId.slice(0, 8)}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                member.role === "owner"
                  ? "bg-accent/15 text-accent"
                  : member.role === "admin"
                  ? "bg-indigo-400/15 text-indigo-400"
                  : "bg-[var(--color-overlay-light)] text-[var(--color-text-secondary)]"
              }`}
            >
              {ROLE_LABEL[member.role] ?? member.role}
            </span>
            {member.userId === userId && (
              <span className="text-xs text-[var(--color-text-secondary)]">본인</span>
            )}
          </div>
          {member.linkedTeacherName && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                // linkedTeacherColor is a dynamic runtime value — inline style required
                style={{ backgroundColor: member.linkedTeacherColor ?? undefined }}
              />
              <span className="text-[11px] text-[var(--color-text-muted)]">
                강사: {member.linkedTeacherName}
              </span>
            </div>
          )}
        </div>
      </div>
      {myRole === "owner" && member.userId !== userId && (
        <Button
          variant="ghost"
          size="small"
          onClick={() => onRemove(member.userId)}
          className="hover:text-red-400 flex-shrink-0 ml-2"
        >
          제거
        </Button>
      )}
    </div>
  );
}
