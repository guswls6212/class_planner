"use client";

import { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  expanded: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_expanded") === "true";
  });

  const toggle = () => {
    setExpanded((v) => {
      const next = !v;
      localStorage.setItem("sidebar_expanded", String(next));
      return next;
    });
  };

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
