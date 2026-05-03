"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  expanded: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Always start collapsed on both server and first client render to keep
  // hydration consistent. Read localStorage AFTER mount and update state
  // (mirrors ThemeContext.tsx pattern).
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_expanded");
      if (saved === "true") setExpanded(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      localStorage.setItem("sidebar_expanded", String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ expanded, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (ctx === undefined) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
