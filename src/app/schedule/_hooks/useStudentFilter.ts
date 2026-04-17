import { useLocal } from "@/hooks/useLocal";

export function useStudentFilter(userId: string | null) {
  const key = `ui:${userId ?? "anonymous"}:selectedStudentIds`;
  const [selectedStudentIds, setSelectedStudentIds] = useLocal<string[]>(key, []);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setSelectedStudentIds([]);

  return {
    selectedStudentIds,
    toggleStudent,
    clearFilter,
  };
}
