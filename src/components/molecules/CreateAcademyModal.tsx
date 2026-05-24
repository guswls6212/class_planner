"use client";

import React, { useEffect, useRef, useState } from "react";
import { Building2, X } from "lucide-react";
import Button from "../atoms/Button";
import { showError } from "@/lib/toast";

interface CreateAcademyModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onCreated: (academyId: string) => void;
}

/**
 * 다중 학원 추가 모달 (ADR-023).
 *
 * 본인 owner 학원 2번째 이상 생성. 첫 학원은 /onboarding 이 담당.
 * 학원명 검증은 server-side (validateAcademyName) 가 SSOT — 빈/짧음/길이 초과 시
 * AppError code 로 응답. 클라이언트는 토스트 노출.
 *
 * 성공 시 onCreated(academyId) — 호출자가 active_academy 전환 + reload 책임.
 */
export default function CreateAcademyModal({
  isOpen,
  userId,
  onClose,
  onCreated,
}: CreateAcademyModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 2 && !submitting && !!userId;

  async function handleSubmit() {
    if (!canSubmit || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/academies?userId=${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        showError(json?.error ?? "학원 추가에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onCreated(json.academy.id as string);
    } catch (e) {
      showError("네트워크 오류로 학원 추가에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
        <div className="h-1 bg-amber-500" />
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold">학원 추가</h2>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                새 학원의 이름을 입력해주세요. 추가 후 자동으로 전환됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] disabled:opacity-30"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
              학원 이름
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) handleSubmit();
              }}
              placeholder="예: 분점, 영어전문관"
              maxLength={30}
              disabled={submitting}
              data-testid="create-academy-name-input"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
            />
            <div className="flex justify-between mt-1 text-[10px] text-[var(--color-text-muted)]">
              <span>2자 이상 30자 이하</span>
              <span>{trimmed.length} / 30</span>
            </div>
          </label>

          <div className="mt-5 flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1"
              data-testid="create-academy-submit"
            >
              {submitting ? "추가 중..." : "학원 추가"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
