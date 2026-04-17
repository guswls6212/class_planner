"use client";

import React, { createContext, useContext, useState } from "react";

interface HelpDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const HelpDrawerContext = createContext<HelpDrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function HelpDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <HelpDrawerContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </HelpDrawerContext.Provider>
  );
}

export function useHelpDrawer() {
  return useContext(HelpDrawerContext);
}
