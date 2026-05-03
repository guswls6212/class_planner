"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Link as LinkIcon,
  MoreVertical,
  Plus,
} from "lucide-react";
import ConfirmModal from "@/components/molecules/ConfirmModal";
import { showToast } from "@/lib/toast";

interface ParentCodeStickyBarProps {
  /** Full academy URL (e.g. "/academy/현진학원" 또는 absolute) — 복사 대상 */
  academyUrl: string;
  /** 현재 학원에서 발급된 코드 수 (전체 갱신 confirm 메시지에 사용) */
  accessCodesCount: number;
  /** 누락 학생 일괄 코드 생성 */
  onBulkCreate: () => void;
  /** 모든 코드 갱신 (재발급) */
  onBulkRenew: () => void;
}

export default function ParentCodeStickyBar({
  academyUrl,
  accessCodesCount,
  onBulkCreate,
  onBulkRenew,
}: ParentCodeStickyBarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showRenewConfirm, setShowRenewConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  const handleCopy = () => {
    if (typeof window === "undefined" || !academyUrl) return;
    window.navigator.clipboard
      ?.writeText(academyUrl)
      .then(() => showToast("success", "URL이 복사됐습니다"))
      .catch(() => showToast("error", "복사에 실패했습니다"));
  };

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]"
        data-testid="parent-code-sticky-bar"
      >
        <LinkIcon
          size={11}
          strokeWidth={1.5}
          className="text-accent flex-shrink-0"
          aria-hidden
        />
        <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
          학부모 접속
        </span>
        <span className="font-mono text-[10px] text-[var(--color-text-secondary)] truncate flex-1">
          {academyUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="URL 복사"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
        >
          <Copy size={11} strokeWidth={1.5} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            aria-label="일괄 작업 메뉴"
            aria-expanded={showMenu}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
          >
            <MoreVertical size={11} strokeWidth={1.5} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 bottom-full mb-1 z-50 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl overflow-hidden"
              role="menu"
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowCreateConfirm(true);
                }}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-overlay-light)] transition-colors"
              >
                <Plus
                  size={14}
                  strokeWidth={1.5}
                  className="mt-0.5 text-[var(--color-text-muted)]"
                />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                    누락 학생 일괄 생성
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    코드 없는 학생에게만 추가 (기존 코드는 그대로)
                  </div>
                </div>
              </button>
              <div className="border-t border-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowRenewConfirm(true);
                }}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-red-500/10 transition-colors"
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={1.5}
                  className="mt-0.5 text-red-400"
                />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-red-400">
                    전체 갱신 (위험)
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    모든 코드 만료 → 학부모 전원에게 재공유 필요
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showCreateConfirm}
        variant="info"
        title="누락 학생 일괄 코드 생성"
        message="코드가 없는 학생에게만 새 접속 코드를 생성합니다. 이미 코드가 있는 학생은 영향받지 않습니다."
        confirmText="생성"
        cancelText="취소"
        onConfirm={() => {
          setShowCreateConfirm(false);
          onBulkCreate();
        }}
        onCancel={() => setShowCreateConfirm(false)}
      />
      <ConfirmModal
        isOpen={showRenewConfirm}
        variant="danger"
        title="모든 접속 코드 전체 갱신"
        message={
          `현재 학원의 ${accessCodesCount}개 접속 코드가 즉시 만료되고 새 코드가 발급됩니다.\n\n` +
          `학부모 ${accessCodesCount}명 전원에게 새 링크를 다시 공유해야 합니다. ` +
          `이전 링크/코드는 더 이상 작동하지 않습니다.\n\n` +
          `정말 진행할까요?`
        }
        confirmText="이해했습니다, 갱신"
        cancelText="취소"
        onConfirm={() => {
          setShowRenewConfirm(false);
          onBulkRenew();
        }}
        onCancel={() => setShowRenewConfirm(false)}
      />
    </>
  );
}
