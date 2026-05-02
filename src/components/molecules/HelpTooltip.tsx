"use client";

import React, { useEffect, useRef, useState } from "react";
import { InfoTrigger } from "@/components/atoms/InfoTrigger";

interface HelpTooltipProps {
  content: string;
  label?: string;
}

export function HelpTooltip({ content, label = "도움말" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flip, setFlip] = useState<"none" | "left">("none");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    setFlip(rect.right > window.innerWidth - 8 ? "left" : "none");
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center">
      <InfoTrigger size="sm" label={label} onClick={() => setIsOpen((v) => !v)} />
      {isOpen && (
        <>
          <div
            data-testid="help-tooltip-backdrop"
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={popoverRef}
            data-testid="help-tooltip-popover"
            data-flip={flip}
            className={[
              "absolute top-0 z-[1000] w-56 max-w-[calc(100vw-32px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)] shadow-admin-md leading-relaxed",
              flip === "left" ? "right-6" : "left-6",
            ].join(" ")}
          >
            {content}
          </div>
        </>
      )}
    </div>
  );
}
