"use client";

import { useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import {
  NAME_MAX_LENGTH,
  getStudentBirthDateRange,
  isBirthDateInRange,
} from "@/lib/validation/profileSchemas";

interface StudentAddDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    options: { gender?: string; birthDate?: string },
  ) => void;
  existingNames: string[];
}

/**
 * 학생 추가 시 이름 + 성별 + 생년월일을 한 화면에서 입력받는 모달.
 * 이름만 필수이며, 성별/생년월일은 "권장" 라벨로 시각화한다.
 *
 * UI_SPEC § 학생 페이지의 ListFilterBar 빠른 추가 흐름은 그대로 유지하고,
 * 본 모달은 메타 정보를 함께 등록하고 싶은 운영자를 위한 별도 진입점.
 *
 * 메타 정보의 역할: 동명이인 식별, 마이그레이션 시 dedup 정확도, 향후 통계.
 */
export default function StudentAddDetailModal({
  isOpen,
  onClose,
  onSubmit,
  existingNames,
}: StudentAddDetailModalProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [birthRange] = useState(() => getStudentBirthDateRange());

  const { containerRef } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrMsg("학생 이름을 입력해주세요.");
      return;
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      setErrMsg(`학생 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (existingNames.includes(trimmed)) {
      setErrMsg("이미 존재하는 학생 이름입니다.");
      return;
    }
    if (birthDate && !isBirthDateInRange(birthDate, birthRange)) {
      setErrMsg("학생 생년월일은 만 4~25세 범위여야 합니다.");
      return;
    }
    onSubmit(trimmed, {
      gender: gender || undefined,
      birthDate: birthDate || undefined,
    });
    setName("");
    setGender("");
    setBirthDate("");
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
        aria-labelledby="student-add-detail-title"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <h2
          id="student-add-detail-title"
          className="mb-4 text-lg font-bold tracking-tight text-[var(--color-text-primary)]"
        >
          학생 추가
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="student-add-name"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              id="student-add-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="예: 김민준"
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
              htmlFor="student-add-gender"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              성별{" "}
              <span className="ml-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                권장
              </span>
            </label>
            <select
              id="student-add-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">선택 안 함</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="student-add-birth"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              생년월일{" "}
              <span className="ml-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                권장
              </span>
            </label>
            <input
              id="student-add-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              min={birthRange.min}
              max={birthRange.max}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            <span aria-hidden="true">ⓘ </span>성별/생년월일은 동명이인 식별과 정확한 데이터 동기화에
            사용됩니다. 비워두고 나중에 채워도 됩니다.
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
