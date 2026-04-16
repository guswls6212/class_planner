"use client";

import { useCallback, useRef, useState } from "react";

interface UseBottomSheetReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  translateY: number;
}

export function useBottomSheet(onClose?: () => void): UseBottomSheetReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const open = useCallback(() => {
    setIsOpen(true);
    setTranslateY(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTranslateY(0);
    onClose?.();
  }, [onClose]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      setTranslateY(diff);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (currentY.current > 100) {
      close();
    } else {
      setTranslateY(0);
    }
  }, [close]);

  return {
    isOpen,
    open,
    close,
    dragHandleProps: { onTouchStart, onTouchMove, onTouchEnd },
    translateY,
  };
}
