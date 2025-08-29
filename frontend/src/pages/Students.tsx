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
    // 기존 과목이 이전 이름을 사용하고 있는지 확인
    const hasOldSubjects = subjects.some(subject =>
      ['수학', '영어', '국어'].includes(subject.name)
    );

    // 새로운 과목들이 모두 포함되어 있는지 확인
    const hasAllNewSubjects = subjects.some(subject =>
      ['초등수학', '중등과학', '고등국어'].includes(subject.name)
    );

    // 기존 과목이 없거나 이전 이름을 사용하고 있거나 새로운 과목이 누락된 경우 새 과목으로 교체
    if (subjects.length === 0 || hasOldSubjects || !hasAllNewSubjects) {
      console.log('🔄 과목 목록을 새로운 9개 과목으로 업데이트합니다...');

      const newSubjects = [
        { id: uid(), name: '초등수학', color: '#fbbf24' }, // 밝은 노란색
        { id: uid(), name: '중등수학', color: '#f59e0b' }, // 주황색
        { id: uid(), name: '중등영어', color: '#3b82f6' }, // 파란색
        { id: uid(), name: '중등국어', color: '#10b981' }, // 초록색
        { id: uid(), name: '중등과학', color: '#ec4899' }, // 분홍색
        { id: uid(), name: '중등사회', color: '#06b6d4' }, // 청록색
        { id: uid(), name: '고등수학', color: '#ef4444' }, // 빨간색
        { id: uid(), name: '고등영어', color: '#8b5cf6' }, // 보라색
        { id: uid(), name: '고등국어', color: '#059669' }, // 진한 초록색
      ];

      setSubjects(newSubjects);

      // 기존 enrollments가 있다면 새로운 과목 ID로 업데이트
      const existingEnrollments = localStorage.getItem('enrollments');
      if (existingEnrollments) {
        try {
          const enrollments = JSON.parse(existingEnrollments);
          if (enrollments.length > 0) {
            console.log(
              '⚠️ 기존 enrollments가 있어서 새로운 과목 ID로 업데이트가 필요합니다.'
            );
            console.log('현재 enrollments:', enrollments);
            console.log('새로운 subjects:', newSubjects);

            // 기존 enrollments 삭제 (새로운 과목으로 다시 생성해야 함)
            localStorage.removeItem('enrollments');
            console.log(
              '🗑️ 기존 enrollments를 삭제했습니다. 새로운 수업을 추가해주세요.'
            );
          }
        } catch (error) {
          console.error('Enrollments 파싱 오류:', error);
        }
      }
    } else {
      console.log(
        '✅ 현재 과목 목록이 최신 상태입니다:',
        subjects.map(s => s.name)
      );
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
