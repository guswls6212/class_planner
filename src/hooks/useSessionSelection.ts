"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 세션 다중 선택 상태 관리.
 *
 * - useStudentFilter는 학생 필터로 localStorage 영속이지만,
 *   세션 선택은 의도적으로 페이지 떠나면 초기화 (모드성 인터랙션).
 * - Esc 키로 전체 해제.
 * - 상한 (default 50) 초과 시 toggle은 무시 + onLimitExceeded 호출.
 */

const DEFAULT_MAX = 50;

export interface SessionSelection {
  selectedSessionIds: string[];
  /** O(1) 조회용 Set */
  selectedSet: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** 선택 목록 통째로 교체 (e.g. drag 후 복사된 ids로) */
  replace: (ids: string[]) => void;
  clear: () => void;
  count: number;
  isAtLimit: boolean;
}

export function useSessionSelection(options?: {
  max?: number;
  /** 상한 초과 시 사용자에게 알릴 콜백 */
  onLimitExceeded?: (max: number) => void;
}): SessionSelection {
  const max = options?.max ?? DEFAULT_MAX;
  const onLimitExceeded = options?.onLimitExceeded;
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const selectedSet = useMemo(
    () => new Set(selectedSessionIds),
    [selectedSessionIds],
  );

  const isSelected = useCallback(
    (id: string) => selectedSet.has(id),
    [selectedSet],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelectedSessionIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= max) {
          onLimitExceeded?.(max);
          return prev;
        }
        return [...prev, id];
      });
    },
    [max, onLimitExceeded],
  );

  const replace = useCallback(
    (ids: string[]) => {
      setSelectedSessionIds(ids.slice(0, max));
    },
    [max],
  );

  const clear = useCallback(() => setSelectedSessionIds([]), []);

  // Esc 키로 전체 해제 (모달 안에서는 무시 — input 등에 focus 시 default behavior)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedSessionIds.length > 0) {
        // input/textarea/contenteditable 안이면 무시 (modal close 등 우선)
        const target = e.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName;
          if (
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            target.isContentEditable
          ) {
            return;
          }
        }
        clear();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedSessionIds.length, clear]);

  return {
    selectedSessionIds,
    selectedSet,
    isSelected,
    toggle,
    replace,
    clear,
    count: selectedSessionIds.length,
    isAtLimit: selectedSessionIds.length >= max,
  };
}
