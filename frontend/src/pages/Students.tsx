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
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              width: '200px',
            }}
          />
          <button 
            onClick={addStudent} 
            style={{
              padding: '8px 16px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            추가
          </button>
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          {students.map(s => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
              }}
            >
              <button
                onClick={() => setSelectedStudentId(s.id)}
                style={{
                  fontWeight: selectedStudentId === s.id ? 600 : 400,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {s.name}
              </button>
              <button
                onClick={() => setStudents(students.filter(x => x.id !== s.id))}
                style={{
                  padding: '4px 8px',
                  background: 'var(--color-danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                삭제
              </button>
            </li>
          ))}
          {students.length === 0 && (
            <li
              style={{
                color: 'var(--color-text-muted)',
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
              color: 'var(--color-text-muted)',
              padding: '8px 0',
              fontSize: '12px',
              textAlign: 'center',
              borderTop: '1px solid var(--color-border-light)',
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
