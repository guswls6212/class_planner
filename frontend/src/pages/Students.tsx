import { useEffect, useState } from 'react';
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
      style={{
        gridTemplateColumns: '340px 1fr',
        gap: 16,
        padding: 16,
      }}
    >
      <section>
        <h2>학생 목록</h2>
        <div className="flex gap-sm">
          <input
            placeholder="학생 이름"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStudent();
              }
            }}
            className="form-input"
            style={{
              background: 'var(--color-white)',
              color: 'var(--color-gray-900)',
              border: '1px solid var(--color-gray-300)',
            }}
          />
          <button onClick={addStudent} className="btn btn-primary">
            추가
          </button>
        </div>
        <ul
          className="student-list"
          style={{
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          {students.map(s => (
            <li
              key={s.id}
              className="flex justify-between"
              style={{ padding: '6px 0' }}
            >
              <button
                onClick={() => setSelectedStudentId(s.id)}
                className={`btn ${selectedStudentId === s.id ? 'font-semibold' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-gray-900)',
                }}
              >
                {s.name}
              </button>
              <button
                onClick={() => setStudents(students.filter(x => x.id !== s.id))}
                className="btn btn-danger"
                style={{ padding: '4px 8px' }}
              >
                삭제
              </button>
            </li>
          ))}
          {students.length === 0 && (
            <li
              style={{
                color: 'var(--color-gray-400)',
                padding: '8px 0',
                textAlign: 'center',
              }}
            >
              학생을 추가해주세요
            </li>
          )}
        </ul>
        {students.length > 10 && (
          <div
            style={{
              color: 'var(--color-gray-500)',
              padding: '8px 0',
              fontSize: '12px',
              textAlign: 'center',
              borderTop: '1px solid var(--color-gray-200)',
              marginTop: '8px',
            }}
          >
            스크롤하여 확인
          </div>
        )}

        {selectedStudentId && (
          <div style={{ marginTop: 16 }}>
            <h3>
              선택된 학생:{' '}
              {students.find(s => s.id === selectedStudentId)?.name}
            </h3>
          </div>
        )}
      </section>
    </div>
  );
}
