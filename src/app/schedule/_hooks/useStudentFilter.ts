import { useState } from "react";
import { useLocal } from "@/hooks/useLocal";

export function useStudentFilter(students: { id: string; name: string }[]) {
  const [selectedStudentIds, setSelectedStudentIds] = useLocal<string[]>(
    "ui:selectedStudentIds",
    []
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setSelectedStudentIds([]);

  const filteredStudents = students.filter((s) =>
    searchQuery.trim()
      ? s.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return {
    selectedStudentIds,
    toggleStudent,
    clearFilter,
    searchQuery,
    setSearchQuery,
    filteredStudents,
  };
}
