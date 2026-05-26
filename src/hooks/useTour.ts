"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  TOUR_AUTO_START_DELAY_MS,
  TOUR_START_EVENT,
  TOUR_STEPS,
  TOUR_TARGET_WAIT_MS,
  getTourFlagKey,
  type TourStep,
} from "@/lib/tour-steps";

export interface UseTourReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep | null;
  targetRect: DOMRect | null;
  isWaitingForTarget: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
  start: () => void;
}

export function useTour(): UseTourReturn {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const router = useRouter();
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isWaitingForTarget, setIsWaitingForTarget] = useState(false);

  const observerRef = useRef<MutationObserver | null>(null);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flagKey = getTourFlagKey(userId);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const complete = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(flagKey, new Date().toISOString());
      } catch {
        // localStorage 비활성/quota 초과 시 silent — flag 못 쓰면 다음 진입 시 다시 보임 (수용)
      }
    }
    setIsActive(false);
    setCurrentStep(0);
    setTargetRect(null);
    setIsWaitingForTarget(false);
  }, [flagKey]);

  const skip = complete;

  const next = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= TOUR_STEPS.length - 1) {
        complete();
        return s;
      }
      return s + 1;
    });
  }, [complete]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let completed: string | null = null;
    try {
      completed = localStorage.getItem(flagKey);
    } catch {
      completed = null;
    }
    if (completed) return;

    autoStartTimeoutRef.current = setTimeout(() => {
      setIsActive(true);
    }, TOUR_AUTO_START_DELAY_MS);

    return () => {
      if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
    };
  }, [flagKey]);

  useEffect(() => {
    const handler = () => start();
    window.addEventListener(TOUR_START_EVENT, handler);
    return () => window.removeEventListener(TOUR_START_EVENT, handler);
  }, [start]);

  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    if (step.targetPath && pathname !== step.targetPath) {
      router.push(step.targetPath);
    }
  }, [isActive, currentStep, pathname, router]);

  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      setIsWaitingForTarget(false);
      return;
    }
    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const findVisible = (): HTMLElement | null => {
      const els = document.querySelectorAll<HTMLElement>(step.targetSelector);
      for (const el of Array.from(els)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
      return null;
    };

    const findAndSet = (): HTMLElement | null => {
      const el = findVisible();
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        setIsWaitingForTarget(false);
      }
      return el;
    };

    const initial = findAndSet();

    if (!initial) {
      setIsWaitingForTarget(true);
      observerRef.current = new MutationObserver(() => {
        if (findAndSet()) {
          observerRef.current?.disconnect();
          observerRef.current = null;
          if (waitTimeoutRef.current) {
            clearTimeout(waitTimeoutRef.current);
            waitTimeoutRef.current = null;
          }
        }
      });
      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      });

      waitTimeoutRef.current = setTimeout(() => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!findVisible()) {
          setIsWaitingForTarget(false);
          next();
        }
      }, TOUR_TARGET_WAIT_MS);
    }

    const updateRect = () => {
      const el = findVisible();
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { capture: true });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, { capture: true });
    };
  }, [isActive, currentStep, next]);

  return {
    isActive,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    step: TOUR_STEPS[currentStep] ?? null,
    targetRect,
    isWaitingForTarget,
    next,
    prev,
    skip,
    complete,
    start,
  };
}
