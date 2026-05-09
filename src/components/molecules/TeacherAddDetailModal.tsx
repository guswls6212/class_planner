"use client";

import { useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import {
  NAME_MAX_LENGTH,
  formatKoreanPhone,
  isValidKoreanPhone,
} from "@/lib/validation/profileSchemas";

interface TeacherAddDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    profile: { email?: string; phone?: string },
  ) => void;
  existingNames: string[];
}

/**
 * 강사 추가 시 이름 + email + 전화번호를 한 화면에서 입력받는 모달.
 * 이름만 필수이며, email/phone은 "권장" 라벨로 시각화한다.
 *
 * UI_SPEC § 강사 페이지의 ListFilterBar 빠른 추가 흐름은 그대로 유지.
 * 본 모달은 운영 정보(연락처)를 함께 등록하고 싶은 운영자를 위한 별도 진입점.
 *
 * role/notes는 등록 후 TeacherDetailPanel에서 입력 (덜 빈번한 메타).
 */
export default function TeacherAddDetailModal({
  isOpen,
  onClose,
  onSubmit,
  existingNames,
}: TeacherAddDetailModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const { containerRef } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrMsg("강사 이름을 입력해주세요.");
      return;
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      setErrMsg(`강사 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (
      existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
    ) {
      setErrMsg("이미 존재하는 강사 이름입니다.");
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrMsg("올바른 이메일 형식이 아닙니다.");
      return;
    }
    if (phone && !isValidKoreanPhone(phone)) {
      setErrMsg("유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678, 02-123-4567)");
      return;
    }
    onSubmit(trimmed, {
      email: trimmedEmail || undefined,
      phone: phone || undefined,
    });
    setName("");
    setEmail("");
    setPhone("");
    setErrMsg("");
    onClose();
  };

  const handleNameChange = (v: string) => {
    setName(v.slice(0, NAME_MAX_LENGTH));
    if (errMsg) setErrMsg("");
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[var(--color-bg-primary)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-add-detail-title"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <h2
          id="teacher-add-detail-title"
          className="mb-4 text-lg font-bold tracking-tight text-[var(--color-text-primary)]"
        >
          강사 추가
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="teacher-add-name"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              id="teacher-add-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="예: 박선생"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div>
            <label
              htmlFor="teacher-add-email"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              이메일{" "}
              <span className="ml-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                권장
              </span>
            </label>
            <input
              id="teacher-add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@academy.com"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-add-phone"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              전화번호{" "}
              <span className="ml-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                권장
              </span>
            </label>
            <input
              id="teacher-add-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatKoreanPhone(e.target.value))}
              placeholder="010-1234-5678"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            <span aria-hidden="true">ⓘ </span>이메일/전화번호는 운영 정보로 사용됩니다. 비워두고 나중에 채워도
            됩니다.
          </p>

          {errMsg && (
            <div
              className="rounded-md border border-red-500/40 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400"
              role="alert"
            >
              {errMsg}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-light)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--color-admin-ink)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!name.trim()}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
