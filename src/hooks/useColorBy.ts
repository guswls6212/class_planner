"use client";
import { useCallback, useEffect, useState } from "react";

export type ColorByMode = "subject" | "student" | "teacher";

const STORAGE_KEY = "ui:colorBy";
const DEFAULT_MODE: ColorByMode = "subject";

export function useColorBy() {
  const [colorBy, setColorByState] = useState<ColorByMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ColorByMode | null;
      if (stored && ["subject", "student", "teacher"].includes(stored)) {
        setColorByState(stored);
      }
    } catch {
      // localStorage unavailable (SSR)
    }
  }, []);

  const setColorBy = useCallback((mode: ColorByMode) => {
    setColorByState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { colorBy, setColorBy };
}
