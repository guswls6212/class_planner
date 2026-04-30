import { useLocal } from "@/hooks/useLocal";

export function useTeacherFilter(userId: string | null) {
  const key = `ui:${userId ?? "anonymous"}:selectedTeacherIds`;
  const [selectedTeacherIds, setSelectedTeacherIds] = useLocal<string[]>(key, []);

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setSelectedTeacherIds([]);

  return {
    selectedTeacherIds,
    toggleTeacher,
    clearFilter,
  };
}
