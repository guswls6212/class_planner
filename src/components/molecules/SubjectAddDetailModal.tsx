"use client";

import { useEffect, useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import { SUBJECT_NAME_MAX_LENGTH } from "@/lib/validation/profileSchemas";
import { DEFAULT_SUBJECT_COLORS, SUBJECT_DEFAULT_COLOR } from "@/lib/subjectColors";

interface SubjectAddDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  /** 모달 열릴 때 이름 prefill (검색창 + Enter로 진입 시 사용 가능). */
  defaultName?: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * 과목 추가 시 이름 + 색상을 한 화면에서 선택하는 모달.
 *
 * 학생/강사 페이지의 "+ 상세 등록" 패턴과 일관. ListFilterBar 빠른 추가
 * (이름만, DEFAULT 색상 자동) 흐름은 그대로 유지.
 */
export default function SubjectAddDetailModal({
  isOpen,
  onClose,
  onSubmit,
  defaultName,
}: SubjectAddDetailModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_DEFAULT_COLOR);
  const [errMsg, setErrMsg] = useState("");

  const { containerRef } = useModalA11y({ isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      setName((defaultName ?? "").slice(0, SUBJECT_NAME_MAX_LENGTH));
      setColor(SUBJECT_DEFAULT_COLOR);
      setErrMsg("");
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrMsg("과목 이름을 입력해주세요.");
      return;
    }
    if (trimmed.length > SUBJECT_NAME_MAX_LENGTH) {
      setErrMsg(`과목 이름은 최대 ${SUBJECT_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (!HEX_RE.test(color)) {
      setErrMsg("올바른 색상 형식이 아닙니다. (예: #3B82F6)");
      return;
    }
    onSubmit(trimmed, color);
    onClose();
  };

  const handleNameChange = (v: string) => {
    setName(v.slice(0, SUBJECT_NAME_MAX_LENGTH));
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
        aria-labelledby="subject-add-detail-title"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <h2
          id="subject-add-detail-title"
          className="mb-4 text-lg font-bold tracking-tight text-[var(--color-text-primary)]"
        >
          과목 추가
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="subject-add-name"
              className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              이름 <span className="text-red-400">*</span>
            </label>
            <input
              id="subject-add-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={SUBJECT_NAME_MAX_LENGTH}
              placeholder="예: 고등수학"
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
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
              색상
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="색상 팔레트">
              {DEFAULT_SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`색상 ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c
                      ? "scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-bg-primary)] ring-white"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  data-testid={`subject-color-swatch-${c}`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent"
                aria-label="색상 직접 선택"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="색상 hex 입력"
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            <span aria-hidden="true">ⓘ </span>색상은 시간표 블록과 필터 칩에 사용됩니다. 나중에 편집에서 변경 가능.
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
