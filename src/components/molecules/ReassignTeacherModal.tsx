"use client";

import { useEffect, useState } from "react";
import { Replace, ArrowRight } from "lucide-react";

interface ReassignableTeacher {
  id: string;
  name: string;
  color: string;
}

interface ReassignTeacherModalProps {
  isOpen: boolean;
  /** 교체 대상 (원 강사) — 이 강사의 모든 수업이 새 강사로 이전 */
  originalTeacher: { id: string; name: string } | null;
  /** 대체 강사 후보 — 원 강사 제외 + 보관 안 된 active 강사만 */
  candidates: ReassignableTeacher[];
  /** 원 강사가 담당 중인 수업 수 (영향 미리보기) */
  affectedSessionCount: number;
  isProcessing?: boolean;
  onConfirm: (toTeacherId: string, archiveOriginal: boolean) => void | Promise<void>;
  onClose: () => void;
}

/**
 * 강사 교체 모달 (PR 8 Phase 2 — design-exploration teacher-replace-ux Variant B).
 * 원 강사의 모든 수업을 대체 강사로 일괄 이전 + (default) 원 강사 자동 보관.
 */
export default function ReassignTeacherModal({
  isOpen,
  originalTeacher,
  candidates,
  affectedSessionCount,
  isProcessing = false,
  onConfirm,
  onClose,
}: ReassignTeacherModalProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [archiveOriginal, setArchiveOriginal] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(candidates[0]?.id ?? "");
      setArchiveOriginal(true);
    }
  }, [isOpen, candidates]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !originalTeacher) return null;

  const selected = candidates.find((c) => c.id === selectedId);
  const canSubmit = Boolean(selected) && !isProcessing;
  const noCandidates = candidates.length === 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl p-5 w-full max-w-md mx-4 border border-amber-400/30"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-title"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 flex-shrink-0">
            <Replace className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 id="reassign-title" className="text-base font-bold">
            {originalTeacher.name} 강사 교체
          </h3>
        </div>

        <p className="text-[12px] text-[var(--color-text-muted)] mb-3">
          담당 수업 {affectedSessionCount}개를 인계받을 강사를 선택하세요
        </p>

        {noCandidates ? (
          <div className="rounded-lg bg-red-500/5 border border-red-500/30 p-3 mb-4 text-[12px] text-red-300">
            교체할 다른 강사가 없습니다. 강사를 추가한 후 다시 시도하세요.
          </div>
        ) : (
          <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
            {candidates.map((t) => (
              <label
                key={t.id}
                data-testid={`reassign-candidate-${t.id}`}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === t.id
                    ? "border-amber-400/50 bg-amber-400/5"
                    : "border-[var(--color-border)] hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  checked={selectedId === t.id}
                  onChange={() => setSelectedId(t.id)}
                  disabled={isProcessing}
                  className="accent-amber-400"
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={archiveOriginal}
            onChange={(e) => setArchiveOriginal(e.target.checked)}
            disabled={isProcessing}
            className="accent-amber-400"
            data-testid="reassign-archive-original-checkbox"
          />
          교체 후 {originalTeacher.name} 강사를 자동 보관
        </label>

        {selected && (
          <div className="rounded-lg bg-amber-400/5 border border-amber-400/20 p-2.5 mb-4 text-[11px] text-amber-200/90 flex items-start gap-2">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              수업 {affectedSessionCount}개 → <strong>{selected.name}</strong> 강사로 이전
              {archiveOriginal && ` + ${originalTeacher.name} 강사 보관`}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-overlay-light)] transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => selected && void onConfirm(selected.id, archiveOriginal)}
            disabled={!canSubmit || noCandidates}
            data-testid="reassign-submit"
            className="flex-1 py-2 bg-amber-400 text-black rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {isProcessing ? "처리 중..." : "교체"}
          </button>
        </div>
      </div>
    </div>
  );
}
