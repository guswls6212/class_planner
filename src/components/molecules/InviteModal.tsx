"use client";

import React, { useEffect, useState } from "react";
import { showError } from "@/lib/toast";

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  member: "강사",
};

interface TeacherOption {
  id: string;
  name: string;
  color: string;
  email: string | null;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onInviteCreated?: () => void;
  /**
   * When provided, the modal pre-selects the teacher and skips role/dropdown UI.
   * Used when the modal is opened from a specific teacher row (e.g. settings page).
   */
  defaultTeacherId?: string;
  defaultTeacherName?: string;
}

export default function InviteModal({
  isOpen,
  onClose,
  userId,
  onInviteCreated,
  defaultTeacherId,
  defaultTeacherName,
}: InviteModalProps) {
  const isPreSelected = Boolean(defaultTeacherId && defaultTeacherName);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  // Teacher selection state
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(false);

  // When opened with a pre-selected teacher, force role=member and selectedTeacherId
  useEffect(() => {
    if (isOpen && defaultTeacherId) {
      setInviteRole("member");
      setSelectedTeacherId(defaultTeacherId);
    }
  }, [isOpen, defaultTeacherId]);

  // Fetch unlinked teachers when role is 'member' and no pre-selection
  useEffect(() => {
    if (!isOpen || inviteRole !== "member" || isPreSelected) {
      if (!isPreSelected) {
        setTeachers([]);
        setSelectedTeacherId("");
      }
      return;
    }
    let cancelled = false;
    const fetchTeachers = async () => {
      setIsFetchingTeachers(true);
      try {
        const res = await fetch(`/api/teachers?userId=${userId}&unlinked=true`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (cancelled) return;
        const options: TeacherOption[] = (data ?? []).map(
          (t: { id: string; name: string; color: string; email: string | null }) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            email: t.email ?? null,
          })
        );
        setTeachers(options);
        setSelectedTeacherId(options.length > 0 ? options[0].id : "");
      } finally {
        if (!cancelled) setIsFetchingTeachers(false);
      }
    };
    fetchTeachers();
    return () => {
      cancelled = true;
    };
  }, [isOpen, inviteRole, userId, isPreSelected]);

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    try {
      const body: Record<string, string> = { role: inviteRole };
      if (inviteRole === "member" && selectedTeacherId) {
        body.teacherId = selectedTeacherId;
      }
      const res = await fetch(`/api/invites?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showError("초대 링크 생성에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        const url = `${window.location.origin}/invite/${data.data.token}`;
        if (typeof window !== "undefined" && window.navigator?.clipboard) {
          try {
            await window.navigator.clipboard.writeText(url);
          } catch {
            // Clipboard write may fail (e.g. permissions); proceed regardless —
            // parent toast still informs the user that creation succeeded.
          }
        }
        handleClose();
        onInviteCreated?.();
      }
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleClose = () => {
    setInviteRole("member");
    setSelectedTeacherId("");
    onClose();
  };

  const noUnlinkedTeachers = inviteRole === "member" && !isFetchingTeachers && teachers.length === 0;
  const canSubmit = inviteRole === "admin" || (inviteRole === "member" && selectedTeacherId !== "");
  const selectedTeacherEmail = selectedTeacherId
    ? teachers.find((t) => t.id === selectedTeacherId)?.email ?? null
    : null;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 w-full max-w-sm mx-4 border border-[var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">멤버 초대</h3>
        <p className="text-[13px] text-[var(--color-text-muted)] mb-5">초대 링크를 생성하여 공유하세요</p>

        {isPreSelected ? (
          /* Pre-selected teacher: skip role/dropdown UI, show static confirmation */
          <div className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-3">
            <p className="text-[13px] text-[var(--color-text-primary)]">
              <span className="font-semibold">{defaultTeacherName ?? "선택된"}</span> 강사의 초대 링크를 생성합니다
            </p>
          </div>
        ) : (
          <>
            <fieldset className="mb-5">
              <legend className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">역할 선택</legend>
              <div className="flex gap-3">
                {(["member", "admin"] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                      inviteRole === r
                        ? "border-accent bg-accent/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="inviteRole"
                      value={r}
                      checked={inviteRole === r}
                      onChange={() => setInviteRole(r)}
                      className="sr-only"
                    />
                    <div className="font-medium text-sm text-[var(--color-text-primary)]">{ROLE_LABEL[r]}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {r === "member" ? "시간표 조회" : "학생·수업 관리 + 초대"}
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Teacher dropdown — only visible for 'member' role */}
            {inviteRole === "member" && (
              <div className="mb-5">
                <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
                  연동할 강사 선택 <span className="text-red-400">(필수)</span>
                </label>
                {isFetchingTeachers ? (
                  <p className="text-[12px] text-[var(--color-text-muted)]">강사 목록 불러오는 중...</p>
                ) : noUnlinkedTeachers ? (
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    먼저{" "}
                    <a href="/teachers" className="text-accent underline">
                      /teachers
                    </a>{" "}
                    페이지에서 강사를 추가해주세요
                  </p>
                ) : (
                  <>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {selectedTeacherId && !selectedTeacherEmail && (
                      <div className="mt-2 rounded-lg bg-yellow-900/20 border border-yellow-700/50 px-3 py-2">
                        <p className="text-xs text-yellow-400">이 강사의 이메일이 등록되지 않았습니다.</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          이메일 없이도 초대할 수 있지만, 다른 사람이 링크를 사용할 수 있습니다.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-overlay-light)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCreateInvite}
            disabled={isCreatingInvite || !canSubmit}
            className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isCreatingInvite ? "생성 중..." : "링크 생성 + 복사"}
          </button>
        </div>
      </div>
    </div>
  );
}
