import { useEffect, useState } from 'react';
import StudentManagementSection from '../components/organisms/StudentManagementSection';
import type { Student, Subject } from '../lib/planner';
import { uid } from '../lib/planner';

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export default function StudentsPage() {
  const [students, setStudents] = useLocal<Student[]>('students', []);
  const [subjects, setSubjects] = useLocal<Subject[]>('subjects', []);
  // 사용하지 않는 변수들 제거
  // const [enrollments, setEnrollments] = useLocal<Enrollment[]>('enrollments', []);

  const [newStudentName, setNewStudentName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    'ui:selectedStudent',
    ''
  );

  function addStudent() {
    const name = newStudentName.trim();
    if (!name) return;

    // 중복 이름 체크
    if (students.some(s => s.name === name)) {
      alert('이미 존재하는 학생 이름입니다.');
      return;
    }

    const student: Student = { id: uid(), name };
    setStudents(prev => [...prev, student]);
    setNewStudentName('');
  }

  useEffect(() => {
    if (subjects.length === 0) {
      setSubjects([
        { id: uid(), name: '수학', color: '#f59e0b' },
        { id: uid(), name: '영어', color: '#3b82f6' },
        { id: uid(), name: '국어', color: '#10b981' },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="grid"
      data-testid="students-page"
      style={{
        gridTemplateColumns: '340px 1fr',
        gap: 16,
        padding: 16,
      }}
    >
      <StudentManagementSection
        students={students}
        newStudentName={newStudentName}
        selectedStudentId={selectedStudentId}
        onNewStudentNameChange={setNewStudentName}
        onAddStudent={addStudent}
        onSelectStudent={setSelectedStudentId}
        onDeleteStudent={studentId =>
          setStudents(students.filter(x => x.id !== studentId))
        }
      />
    </div>
  );
}
