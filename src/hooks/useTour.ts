"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRole } from "@/hooks/useMyRole";
import {
  TOUR_AUTO_START_DELAY_MS,
  TOUR_FLAG_KEY_PREFIX,
  TOUR_START_EVENT,
  TOUR_TARGET_WAIT_MS,
  getTourFlagKey,
  getTourLoginFlagKey,
  getTourStepsForRole,
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
  const { role } = useMyRole();
  const userId = session?.user?.id ?? null;
  const isLoggedIn = !!session;
  const router = useRouter();
  const pathname = usePathname();

  const activeSteps = useMemo(
    () => getTourStepsForRole(isLoggedIn, role ?? null),
    [isLoggedIn, role],
  );

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isWaitingForTarget, setIsWaitingForTarget] = useState(false);

  const observerRef = useRef<MutationObserver | null>(null);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coreFlagKey = getTourFlagKey(userId);
  const loginFlagKey = getTourLoginFlagKey(userId);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const persistSegmentFlag = useCallback(
    (segment: "core" | "login") => {
      if (typeof window === "undefined") return;
      const key = segment === "core" ? coreFlagKey : loginFlagKey;
      try {
        localStorage.setItem(key, new Date().toISOString());
      } catch {
        // localStorage 비활성/quota 초과 시 silent
      }
    },
    [coreFlagKey, loginFlagKey],
  );

  const complete = useCallback(() => {
    const currentStepObj = activeSteps[currentStep];
    if (currentStepObj) {
      persistSegmentFlag(currentStepObj.segment);
    }
    setIsActive(false);
    setCurrentStep(0);
    setTargetRect(null);
    setIsWaitingForTarget(false);
  }, [activeSteps, currentStep, persistSegmentFlag]);

  const skip = complete;

  const next = useCallback(() => {
    setCurrentStep((s) => {
      const cur = activeSteps[s];
      const nxt = activeSteps[s + 1];
      if (cur && nxt && cur.segment !== nxt.segment) {
        persistSegmentFlag(cur.segment);
      }
      if (s >= activeSteps.length - 1) {
        complete();
        return s;
      }
      return s + 1;
    });
  }, [activeSteps, complete, persistSegmentFlag]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  // anonymous → user 전환 시 core flag 마이그레이션 (anonymous 에서 봤으면 user 도 본 것으로 인정).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;
    try {
      const anonFlag = localStorage.getItem(`${TOUR_FLAG_KEY_PREFIX}anonymous`);
      if (anonFlag && !localStorage.getItem(coreFlagKey)) {
        localStorage.setItem(coreFlagKey, anonFlag);
      }
    } catch {
      // localStorage 비활성 시 silent
    }
  }, [userId, coreFlagKey]);

  // 자동 시작 logic — anonymous: core 미완료 시 / login: core 미완료 시 from 0, core 완료 + login 미완료 시 from login segment 시작점.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let coreDone: string | null = null;
    let loginDone: string | null = null;
    try {
      coreDone = localStorage.getItem(coreFlagKey);
      if (isLoggedIn) loginDone = localStorage.getItem(loginFlagKey);
    } catch {
      return;
    }

    let startIndex: number | null = null;
    if (!coreDone) {
      startIndex = 0;
    } else if (isLoggedIn && !loginDone) {
      // role 별 visible login segment 시작점 — activeSteps 안에서 첫 login segment 찾기
      const loginStart = activeSteps.findIndex((s) => s.segment === "login");
      startIndex = loginStart === -1 ? null : loginStart;
    }

    if (startIndex === null || startIndex >= activeSteps.length) return;

    autoStartTimeoutRef.current = setTimeout(() => {
      setCurrentStep(startIndex);
      setIsActive(true);
    }, TOUR_AUTO_START_DELAY_MS);

    return () => {
      if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
    };
  }, [coreFlagKey, loginFlagKey, isLoggedIn, activeSteps]);

  useEffect(() => {
    const handler = () => start();
    window.addEventListener(TOUR_START_EVENT, handler);
    return () => window.removeEventListener(TOUR_START_EVENT, handler);
  }, [start]);

  useEffect(() => {
    if (!isActive) return;
    const step = activeSteps[currentStep];
    if (!step) return;

    if (step.targetPath && pathname !== step.targetPath) {
      router.push(step.targetPath);
    }
  }, [isActive, currentStep, activeSteps, pathname, router]);

  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      setIsWaitingForTarget(false);
      return;
    }
    const step = activeSteps[currentStep];
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
  }, [isActive, currentStep, activeSteps, next]);

  return {
    isActive,
    currentStep,
    totalSteps: activeSteps.length,
    step: activeSteps[currentStep] ?? null,
    targetRect,
    isWaitingForTarget,
    next,
    prev,
    skip,
    complete,
    start,
  };
}
