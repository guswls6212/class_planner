"use client";

import React, { useState } from "react";
import { showError, showSuccess } from "@/lib/toast";
import { logger } from "@/lib/logger";
import { DEFAULT_TEACHER_COLORS } from "@/lib/teacherColors";

interface TeacherAddModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

type Action = "invite" | "share" | "add_only";

interface CreatedTeacher {
  id: string;
}

export function TeacherAddModal({ open, userId, onClose, onSuccess }: TeacherAddModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submittingAction, setSubmittingAction] = useState<Action | null>(null);

  const hasEmail = email.trim().length > 0;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSubmittingAction(null);
  };

  const handleClose = () => {
    if (submittingAction) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (action: Action) => {
    if (!name.trim()) {
      showError("강사 이름을 입력해주세요.");
      return;
    }
    if (!userId) {
      showError("사용자 정보를 확인할 수 없습니다.");
      return;
    }
    setSubmittingAction(action);
    try {
      // 1. POST /api/teachers — create teacher
      const color =
        DEFAULT_TEACHER_COLORS[Math.floor(Math.random() * DEFAULT_TEACHER_COLORS.length)];
      const teacherRes = await fetch(`/api/teachers?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const teacherData = await teacherRes.json();
      if (!teacherRes.ok || !teacherData.success) {
        const message =
          typeof teacherData?.error === "string"
            ? teacherData.error
            : teacherData?.error?.code === "TEACHER_NAME_DUPLICATE"
              ? "이미 같은 이름의 강사가 있습니다."
              : "강사 추가에 실패했습니다.";
        showError(message);
        return;
      }
      const teacher = teacherData.data as CreatedTeacher;

      // 2. Action-specific follow-up
      if (action === "invite") {
        const inviteRes = await fetch(`/api/invites?userId=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "member", teacherId: teacher.id }),
        });
        if (!inviteRes.ok) {
          showError("강사는 추가되었지만 초대 링크 생성에 실패했습니다.");
        } else {
          showSuccess("강사 추가 + 초대 링크가 생성되었습니다.");
        }
      } else if (action === "share") {
        const shareRes = await fetch(`/api/share-tokens?userId=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: teacher.id,
            label: `${name.trim()} 강사 시간표`,
            expiresInDays: 30,
          }),
        });
        if (!shareRes.ok) {
          showError("강사는 추가되었지만 공유 링크 생성에 실패했습니다.");
        } else {
          showSuccess("강사 추가 + 공유 링크가 발급되었습니다.");
        }
      } else {
        showSuccess("강사가 추가되었습니다.");
      }

      // 3. Notify parent + reset
      await onSuccess();
      resetForm();
      onClose();
    } catch (err) {
      logger.error("강사 추가 실패", { action }, err as Error);
      showError("강사 추가 중 오류가 발생했습니다.");
    } finally {
      setSubmittingAction(null);
    }
  };

  if (!open) return null;

  const isBusy = submittingAction !== null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl p-6 w-full max-w-sm mx-4 border border-[var(--color-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">강사 추가</h3>
        <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
          강사 정보를 입력하고 다음 단계를 선택하세요
        </p>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
            이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김강사"
            disabled={isBusy}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        <div className="mb-4">
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
            이메일 (선택)
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="park@example.com"
            disabled={isBusy}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            {hasEmail
              ? `${email.trim()} 으로 초대 링크를 특정합니다 (보안)`
              : "이메일을 입력하면 초대 보안이 강화됩니다"}
          </p>
        </div>

        <div className="mb-5">
          <label className="text-[13px] font-medium text-[var(--color-text-secondary)] block mb-1">
            전화번호 (선택)
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            disabled={isBusy}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        </div>

        {hasEmail ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("invite")}
              disabled={isBusy}
              className="w-full py-2 bg-accent text-[var(--color-admin-ink)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submittingAction === "invite" ? "처리 중..." : "추가 + 초대 링크 발송"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("share")}
              disabled={isBusy}
              className="w-full py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-overlay-light)] disabled:opacity-50 transition-colors"
            >
              {submittingAction === "share" ? "처리 중..." : "추가 + 시간표 공유 링크만"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("add_only")}
              disabled={isBusy}
              className="w-full py-2 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] disabled:opacity-50 transition-colors"
            >
              {submittingAction === "add_only" ? "처리 중..." : "일단 추가만 (나중에 결정)"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("share")}
              disabled={isBusy}
              className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submittingAction === "share" ? "처리 중..." : "추가 + 공유 링크 발급"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("add_only")}
              disabled={isBusy}
              className="w-full py-2 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] disabled:opacity-50 transition-colors"
            >
              {submittingAction === "add_only" ? "처리 중..." : "일단 추가만"}
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="w-full py-2 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] disabled:opacity-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
