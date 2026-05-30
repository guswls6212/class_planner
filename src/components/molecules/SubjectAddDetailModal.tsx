"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { SUBJECT_NAME_MAX_LENGTH } from "@/lib/validation/profileSchemas";
import { DEFAULT_SUBJECT_COLORS, SUBJECT_DEFAULT_COLOR } from "@/lib/subjectColors";
import { ColorPicker } from "./ColorPicker";
import { Modal } from "@/components/atoms/Modal";

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

  useEffect(() => {
    if (isOpen) {
      setName((defaultName ?? "").slice(0, SUBJECT_NAME_MAX_LENGTH));
      setColor(SUBJECT_DEFAULT_COLOR);
      setErrMsg("");
    }
  }, [isOpen, defaultName]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="subject-add-detail-title"
      maxWidth="max-w-[420px]"
      bodyClassName="p-6"
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
            <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
              <Palette size={11} strokeWidth={1.5} />
              색상
            </label>
            <ColorPicker
              value={color}
              onChange={setColor}
              palette={DEFAULT_SUBJECT_COLORS}
            />
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
      </Modal>
  );
}
