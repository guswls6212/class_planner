import { useCallback, useState } from "react";

export function useUiState() {
  const [isStudentDragging, setIsStudentDragging] = useState(false);
  const [gridVersion, setGridVersion] = useState(0);

  const bumpGridVersion = useCallback(() => {
    setGridVersion((v) => v + 1);
  }, []);

  return {
    isStudentDragging,
    setIsStudentDragging,
    gridVersion,
    setGridVersion,
    bumpGridVersion,
  } as const;
}
