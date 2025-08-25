import { useEffect, useMemo, useState } from 'react';
import './App.css';

type Student = { id: string; name: string; gender?: string };
type Subject = { id: string; name: string; color?: string };
type Enrollment = { id: string; studentId: string; subjectId: string };
type Session = {
  id: string;
  enrollmentId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room?: string;
};

function uid() {
  return crypto.randomUUID();
}

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => store.get(key, initial));
  useEffect(() => {
    store.set(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
const SLOT_MIN = 15;
const DAY_START_MIN = 9 * 60;
const DAY_END_MIN = 22 * 60;
const SLOT_PX = 16;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function snapToSlot(mins: number): number {
  return Math.floor(mins / SLOT_MIN) * SLOT_MIN;
}

function App() {
  const [students, setStudents] = useLocal<Student[]>('students', []);
  const [subjects, setSubjects] = useLocal<Subject[]>('subjects', []);
  const [enrollments, setEnrollments] = useLocal<Enrollment[]>(
    'enrollments',
    []
  );
  const [sessions, setSessions] = useLocal<Session[]>('sessions', []);

  const [newStudentName, setNewStudentName] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  // drag selection state
  const [dragDay, setDragDay] = useState<number | null>(null);
  const [dragStartMin, setDragStartMin] = useState<number | null>(null);
  const [dragEndMin, setDragEndMin] = useState<number | null>(null);
  // form state
  const [formWeekday, setFormWeekday] = useState(0);
  const [formStart, setFormStart] = useState('16:00');
  const [formDuration, setFormDuration] = useState(60);

  const selectedStudentEnrolls = useMemo(
    () => enrollments.filter(e => e.studentId === selectedStudentId),
    [enrollments, selectedStudentId]
  );

  const selectedStudentSessions = useMemo(
    () =>
      new Map<number, Session[]>(
        sessions
          .filter(s =>
            selectedStudentEnrolls.some(e => e.id === s.enrollmentId)
          )
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>())
      ),
    [sessions, selectedStudentEnrolls]
  );

  function addStudent() {
    const name = newStudentName.trim();
    if (!name) return;
    const student: Student = { id: uid(), name };
    setStudents([...students, student]);
    setNewStudentName('');
  }

  function addEnrollment(subjectId: string) {
    const studentId = selectedStudentId;
    if (!studentId) return;
    const exists = enrollments.some(
      e => e.studentId === studentId && e.subjectId === subjectId
    );
    if (exists) return;
    const e: Enrollment = { id: uid(), studentId, subjectId };
    setEnrollments([...enrollments, e]);
  }

  function addSession(
    enrollmentId: string,
    weekday: number,
    startsAt: string,
    endsAt: string
  ) {
    const overlaps = sessions.some(s =>
      s.enrollmentId !== enrollmentId
        ? sessionsOverlapSameStudent(
            s,
            { enrollmentId, weekday, startsAt, endsAt } as Omit<Session, 'id'>,
            enrollments
          )
        : false
    );
    if (overlaps) {
      alert('시간이 겹칩니다.');
      return;
    }
    const se: Session = { id: uid(), enrollmentId, weekday, startsAt, endsAt };
    setSessions([...sessions, se]);
  }

  function confirmDragCreate() {
    if (dragDay === null || dragStartMin === null || dragEndMin === null)
      return;
    if (!selectedStudentEnrolls.length) {
      alert('먼저 과목을 등록하세요.');
      return;
    }
    const enrollmentId = selectedStudentEnrolls[0].id; // 기본값: 첫 과목
    const start = minutesToTime(dragStartMin);
    const end = minutesToTime(dragEndMin);
    addSession(enrollmentId, dragDay, start, end);
    setDragDay(null);
    setDragStartMin(null);
    setDragEndMin(null);
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

  const totalSlots = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;
  const columnHeight = totalSlots * SLOT_PX;

  const timeOptions = Array.from({ length: totalSlots + 1 }, (_, i) =>
    minutesToTime(DAY_START_MIN + i * SLOT_MIN)
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 16,
        padding: 16,
      }}
    >
      <section>
        <h2>학생 목록</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="학생 이름"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
          />
          <button onClick={addStudent}>추가</button>
        </div>
        <ul>
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
                style={{ fontWeight: selectedStudentId === s.id ? 600 : 400 }}
              >
                {s.name}
              </button>
              <button
                onClick={() => setStudents(students.filter(x => x.id !== s.id))}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>

        {selectedStudentId && (
          <div style={{ marginTop: 16 }}>
            <h3>과목 등록</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {subjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => addEnrollment(sub.id)}
                  style={{
                    background: sub.color ?? '#ddd',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 4,
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
            <ul>
              {selectedStudentEnrolls.map(e => {
                const subj = subjects.find(s => s.id === e.subjectId)!;
                return (
                  <li
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: subj.color,
                        display: 'inline-block',
                        borderRadius: 2,
                      }}
                    />{' '}
                    {subj.name}
                  </li>
                );
              })}
            </ul>

            {selectedStudentEnrolls.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <strong>수업 추가(폼)</strong>
                <select
                  value={formWeekday}
                  onChange={e => setFormWeekday(Number(e.target.value))}
                >
                  {weekdays.map((w, i) => (
                    <option key={i} value={i}>
                      {w}
                    </option>
                  ))}
                </select>
                <select
                  value={formStart}
                  onChange={e => setFormStart(e.target.value)}
                >
                  {timeOptions.slice(0, -1).map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={formDuration}
                  onChange={e => setFormDuration(Number(e.target.value))}
                >
                  {[30, 45, 60, 75, 90].map(d => (
                    <option key={d} value={d}>
                      {d}분
                    </option>
                  ))}
                </select>
                <select id="enr" defaultValue={selectedStudentEnrolls[0].id}>
                  {selectedStudentEnrolls.map(e => {
                    const subj = subjects.find(s => s.id === e.subjectId)!;
                    return (
                      <option key={e.id} value={e.id}>
                        {subj.name}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => {
                    const enrollmentId = (
                      document.getElementById('enr') as HTMLSelectElement
                    ).value;
                    const startMin = timeToMinutes(formStart);
                    const endMin = startMin + formDuration;
                    addSession(
                      enrollmentId,
                      formWeekday,
                      minutesToTime(startMin),
                      minutesToTime(endMin)
                    );
                  }}
                >
                  추가
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2>주간 시간표</h2>
        {/* 헤더 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)',
            gap: 4,
            alignItems: 'end',
          }}
        >
          <div />
          {weekdays.map((w, i) => (
            <div key={i} style={{ textAlign: 'center', fontWeight: 600 }}>
              {w}
            </div>
          ))}
        </div>
        {/* 바디 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)',
            gap: 4,
          }}
        >
          {/* 시간 라벨 컬럼 */}
          <div style={{ position: 'relative', height: columnHeight }}>
            {Array.from(
              { length: (DAY_END_MIN - DAY_START_MIN) / 60 + 1 },
              (_, i) => DAY_START_MIN + i * 60
            ).map(min => (
              <div
                key={min}
                style={{
                  position: 'absolute',
                  top: ((min - DAY_START_MIN) / SLOT_MIN) * SLOT_PX - 8,
                  right: 8,
                  fontSize: 12,
                }}
              >
                {minutesToTime(min)}
              </div>
            ))}
          </div>

          {/* 요일 컬럼들 */}
          {weekdays.map((_, dayIdx) => {
            const blocks = selectedStudentSessions.get(dayIdx) ?? [];
            return (
              <div
                key={dayIdx}
                onMouseDown={e => {
                  const rect = (
                    e.currentTarget as HTMLDivElement
                  ).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minFromTop = snapToSlot(
                    Math.round(y / SLOT_PX) * SLOT_MIN
                  );
                  const absoluteMin = clamp(
                    DAY_START_MIN + minFromTop,
                    DAY_START_MIN,
                    DAY_END_MIN - SLOT_MIN
                  );
                  setDragDay(dayIdx);
                  setDragStartMin(absoluteMin);
                  setDragEndMin(absoluteMin + SLOT_MIN);
                }}
                onMouseMove={e => {
                  if (dragDay !== dayIdx || dragStartMin === null) return;
                  const rect = (
                    e.currentTarget as HTMLDivElement
                  ).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minFromTop = snapToSlot(
                    Math.round(y / SLOT_PX) * SLOT_MIN
                  );
                  const absoluteMin = clamp(
                    DAY_START_MIN + minFromTop,
                    DAY_START_MIN,
                    DAY_END_MIN
                  );
                  const start = dragStartMin;
                  const end = clamp(
                    Math.max(start + SLOT_MIN, absoluteMin),
                    DAY_START_MIN + SLOT_MIN,
                    DAY_END_MIN
                  );
                  setDragEndMin(end);
                }}
                onMouseUp={() => {
                  if (dragDay === dayIdx) confirmDragCreate();
                }}
                style={{
                  position: 'relative',
                  height: columnHeight,
                  backgroundSize: `100% ${SLOT_PX}px`,
                  backgroundImage:
                    'linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
                }}
              >
                {/* 기존 일정 렌더 */}
                {blocks.map(b => {
                  const subj = subjects.find(
                    s =>
                      s.id ===
                      enrollments.find(e => e.id === b.enrollmentId)?.subjectId
                  );
                  const top =
                    ((timeToMinutes(b.startsAt) - DAY_START_MIN) / SLOT_MIN) *
                    SLOT_PX;
                  const height =
                    ((timeToMinutes(b.endsAt) - timeToMinutes(b.startsAt)) /
                      SLOT_MIN) *
                    SLOT_PX;
                  return (
                    <div
                      key={b.id}
                      style={{
                        position: 'absolute',
                        left: 2,
                        right: 2,
                        top,
                        height,
                        background: subj?.color ?? '#888',
                        color: '#fff',
                        borderRadius: 4,
                        padding: '4px 6px',
                        fontSize: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {subj?.name} {b.startsAt}-{b.endsAt}
                    </div>
                  );
                })}

                {/* 드래그 프리뷰 */}
                {dragDay === dayIdx &&
                  dragStartMin !== null &&
                  dragEndMin !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 2,
                        right: 2,
                        top:
                          ((dragStartMin - DAY_START_MIN) / SLOT_MIN) * SLOT_PX,
                        height:
                          ((dragEndMin - dragStartMin) / SLOT_MIN) * SLOT_PX,
                        background: 'rgba(59,130,246,0.35)',
                        border: '1px dashed #1d4ed8',
                        borderRadius: 4,
                      }}
                    />
                  )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function sessionsOverlapSameStudent(
  a: {
    enrollmentId: string;
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  b: {
    enrollmentId: string;
    weekday: number;
    startsAt: string;
    endsAt: string;
  },
  enrolls: Enrollment[]
) {
  if (a.weekday !== b.weekday) return false;
  const aStudent = enrolls.find(e => e.id === a.enrollmentId)?.studentId;
  const bStudent = enrolls.find(e => e.id === b.enrollmentId)?.studentId;
  if (!aStudent || !bStudent || aStudent !== bStudent) return false;
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export default function App() {
  return null;
}
