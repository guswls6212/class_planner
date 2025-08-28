import { useEffect, useMemo, useState } from 'react';
import Button from '../components/atoms/Button';
import Label from '../components/atoms/Label';
import Card from '../components/molecules/Card';
import TimeTableGrid from '../components/organisms/TimeTableGrid';
import type { Enrollment, Session, Student, Subject } from '../lib/planner';
import { weekdays } from '../lib/planner';
import styles from './Schedule.module.css';

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

export default function SchedulePage() {
  const [subjects] = useLocal<Subject[]>('subjects', []);
  const [enrollments, setEnrollments] = useLocal<Enrollment[]>(
    'enrollments',
    []
  );
  const [sessions, setSessions] = useLocal<Session[]>('sessions', []);
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    'ui:selectedStudent',
    ''
  );
  const [students] = useLocal<Student[]>('students', []);

  // 학생 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 검색어에 따라 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    return students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const selectedStudentEnrolls = useMemo(
    () => enrollments.filter(e => e.studentId === selectedStudentId),
    [enrollments, selectedStudentId]
  );

  // 선택된 학생이 있으면 해당 학생의 세션만, 없으면 전체 세션 표시
  const displaySessions = useMemo(() => {
    if (selectedStudentId) {
      // 선택된 학생의 세션만 필터링
      return new Map<number, Session[]>(
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
      );
    } else {
      // 전체 학생의 세션 표시
      return new Map<number, Session[]>(
        sessions
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .reduce((acc, s) => {
            const list = acc.get(s.weekday) ?? [];
            list.push(s);
            acc.set(s.weekday, list);
            return acc;
          }, new Map<number, Session[]>())
      );
    }
  }, [sessions, selectedStudentEnrolls, selectedStudentId]);

  // 학생 패널 위치 (드래그로 이동 가능)
  const [panelPos, setPanelPos] = useLocal<{ x: number; y: number }>(
    'ui:studentsPanelPos',
    { x: 600, y: 90 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    studentId: '',
    weekday: 0,
    startTime: '16:00',
    endTime: '17:00',
  });

  // 편집 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<{
    sessionId: string;
    enrollmentId: string;
    studentId: string;
    subjectId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  } | null>(null);

  // 과목 추가 함수 - 사용하지 않으므로 제거
  // function addEnrollment(studentId: string, subjectId: string) {
  //   const exists = enrollments.some(
  //     e => e.studentId === studentId && e.subjectId === subjectId
  //   );
  //   if (exists) return;
  //   const e: Enrollment = { id: crypto.randomUUID(), studentId, subjectId };
  //   setEnrollments([...enrollments, e]);
  // }

  // 세션 추가 함수
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
    const se: Session = {
      id: crypto.randomUUID(),
      enrollmentId,
      weekday,
      startsAt,
      endsAt,
    };
    setSessions([...sessions, se]);
  }

  // 세션 편집 함수
  function editSession(
    sessionId: string,
    enrollmentId: string,
    weekday: number,
    startsAt: string,
    endsAt: string
  ) {
    const overlaps = sessions.some(s =>
      s.id !== sessionId && s.enrollmentId !== enrollmentId
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

    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId ? { ...s, weekday, startsAt, endsAt } : s
      )
    );
  }

  // 세션 삭제 함수
  function deleteSession(sessionId: string) {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }

  // 편집 모달 표시 함수
  function openEditModal(session: Session) {
    console.log('🔍 openEditModal called with session:', session);

    const enrollment = enrollments.find(e => e.id === session.enrollmentId);
    console.log('🔍 Found enrollment:', enrollment);

    const student = students.find(s => s.id === enrollment?.studentId);
    console.log('🔍 Found student:', student);

    const subject = subjects.find(sub => sub.id === enrollment?.subjectId);
    console.log('🔍 Found subject:', subject);

    if (!enrollment || !student || !subject) {
      console.log('❌ Modal not opened - missing data:', {
        hasEnrollment: !!enrollment,
        hasStudent: !!student,
        hasSubject: !!subject,
      });
      return;
    }

    console.log('✅ Opening modal with data:', {
      sessionId: session.id,
      enrollmentId: session.enrollmentId,
      studentId: student.id,
      subjectId: subject.id,
      weekday: session.weekday,
      startTime: session.startsAt,
      endTime: session.endsAt,
    });

    setEditModalData({
      sessionId: session.id,
      enrollmentId: session.enrollmentId,
      studentId: student.id,
      subjectId: subject.id,
      weekday: session.weekday,
      startTime: session.startsAt,
      endTime: session.endsAt,
    });
    setShowEditModal(true);
  }

  // 모달에서 과목 선택 및 시간 설정 완료
  function handleModalSubmit() {
    const { studentId, startTime, endTime } = modalData;
    const subjectId = (
      document.getElementById('modal-subject') as HTMLSelectElement
    )?.value;
    const weekday = Number(
      (document.getElementById('modal-weekday') as HTMLSelectElement)?.value
    );
    const customStartTime = (
      document.getElementById('modal-start-time') as HTMLInputElement
    )?.value;
    const customEndTime = (
      document.getElementById('modal-end-time') as HTMLInputElement
    )?.value;

    if (!subjectId) return;

    // 과목 등록 (없으면)
    let enrollmentId = enrollments.find(
      e => e.studentId === studentId && e.subjectId === subjectId
    )?.id;
    if (!enrollmentId) {
      const newEnrollment: Enrollment = {
        id: crypto.randomUUID(),
        studentId,
        subjectId,
      };
      setEnrollments([...enrollments, newEnrollment]);
      enrollmentId = newEnrollment.id;
    }

    // 세션 추가
    addSession(
      enrollmentId,
      weekday,
      customStartTime || startTime,
      customEndTime || endTime
    );
    setShowModal(false);
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging) return;
      setPanelPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
    function onUp() {
      setIsDragging(false);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragOffset, setPanelPos]);

  return (
    <div className="timetable-container" style={{ padding: 16 }}>
      <h2>주간 시간표</h2>
      {selectedStudentId ? (
        <p style={{ color: 'var(--color-gray-500)' }}>
          {students.find(s => s.id === selectedStudentId)?.name} 학생의
          시간표입니다. 다른 학생을 선택하거나 선택 해제하여 전체 시간표를 볼 수
          있습니다.
        </p>
      ) : (
        <p style={{ color: 'var(--color-gray-500)' }}>
          전체 학생의 시간표입니다. 수강생 리스트에서 학생을 선택하면 해당
          학생의 시간표만 볼 수 있습니다.
        </p>
      )}

      {/* TimeTableGrid 컴포넌트 사용 */}
      <TimeTableGrid
        sessions={displaySessions}
        subjects={subjects}
        enrollments={enrollments}
        onSessionClick={openEditModal}
        onDrop={(weekday, time, enrollmentId) => {
          // 드롭된 학생 ID를 enrollmentId로 사용
          const studentId = enrollmentId;

          // 모달 데이터 설정
          const [hours, minutes] = time.split(':').map(Number);
          const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          const endTime = `${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          // 모달 표시
          setModalData({
            studentId,
            weekday,
            startTime,
            endTime,
          });
          setShowModal(true);
        }}
      />

      {/* 플로팅 학생 리스트 패널 */}
      <div
        className={`${styles.floatingPanel} position-fixed overflow-auto`}
        style={{
          left: panelPos.x,
          top: panelPos.y,
          width: 280,
          maxHeight: '400px',
          padding: 16,
        }}
      >
        {/* 드래그 가능한 헤더 */}
        <div
          className={`${styles.panelHeader} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setIsDragging(true);
              setDragOffset({
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY,
              });
            }
          }}
        >
          수강생 리스트
        </div>

        {/* 검색 입력창 */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="학생 이름 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.studentList} role="list">
          {filteredStudents.map(s => (
            <div key={s.id} role="listitem">
              <div
                draggable
                className={`${styles.studentItem} ${selectedStudentId === s.id ? styles.selected : ''}`}
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', s.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onMouseDown={() => {
                  // 드래그 중이 아닐 때만 클릭 이벤트 처리
                  if (!isDragging) {
                    if (selectedStudentId === s.id) {
                      // 이미 선택된 학생이면 선택 해제
                      setSelectedStudentId('');
                    } else {
                      // 새로운 학생 선택
                      setSelectedStudentId(s.id);
                    }
                  }
                }}
              >
                {s.name}
              </div>
            </div>
          ))}
          {filteredStudents.length === 0 && (
            <div
              style={{ color: 'var(--color-gray-400)', padding: '8px 12px' }}
              role="listitem"
            >
              {searchQuery.trim()
                ? '검색 결과가 없습니다'
                : '학생 페이지에서 학생을 추가하세요'}
            </div>
          )}
        </div>
      </div>

      {/* 과목 선택 및 시간 설정 모달 */}
      {showModal && (
        <Card
          title="수업 추가"
          variant="elevated"
          padding="large"
          className="modal-overlay position-fixed z-1000"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: 280,
          }}
        >
          <div className="modal-form">
            <div className="form-group">
              <Label htmlFor="modal-subject" required>
                과목
              </Label>
              <select id="modal-subject" className="form-select">
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <Label htmlFor="modal-weekday" required>
                요일
              </Label>
              <select
                id="modal-weekday"
                className="form-select"
                defaultValue={modalData.weekday}
              >
                {weekdays.map((w, idx) => (
                  <option key={idx} value={idx}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <Label htmlFor="modal-start-time" required>
                시작 시간
              </Label>
              <input
                id="modal-start-time"
                type="time"
                className="form-input"
                defaultValue={modalData.startTime}
              />
            </div>
            <div className="form-group">
              <Label htmlFor="modal-end-time" required>
                종료 시간
              </Label>
              <input
                id="modal-end-time"
                type="time"
                className="form-input"
                defaultValue={modalData.endTime}
              />
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="transparent" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleModalSubmit}>
              추가
            </Button>
          </div>
        </Card>
      )}

      {/* 편집 모달 */}
      {showEditModal && editModalData && (
        <div className={styles.modalOverlay}>
          <h4 className={styles.modalHeader}>수업 편집</h4>
          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>학생</label>
              <div className={styles.formInput}>
                {students.find(s => s.id === editModalData.studentId)?.name}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>과목</label>
              <div className={styles.formInput}>
                {subjects.find(s => s.id === editModalData.subjectId)?.name}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>요일</label>
              <select
                id="edit-modal-weekday"
                className={styles.formSelect}
                defaultValue={editModalData.weekday}
              >
                {weekdays.map((w, idx) => (
                  <option key={idx} value={idx}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>시작 시간</label>
              <input
                id="edit-modal-start-time"
                type="time"
                className={styles.formInput}
                defaultValue={editModalData.startTime}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>종료 시간</label>
              <input
                id="edit-modal-end-time"
                type="time"
                className={styles.formInput}
                defaultValue={editModalData.endTime}
              />
            </div>
          </div>
          <div className={styles.modalActions}>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('정말 삭제하시겠습니까?')) {
                  deleteSession(editModalData.sessionId);
                  setShowEditModal(false);
                }
              }}
            >
              삭제
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="transparent"
                onClick={() => setShowEditModal(false)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const weekday = Number(
                    (
                      document.getElementById(
                        'edit-modal-weekday'
                      ) as HTMLSelectElement
                    )?.value
                  );
                  const startTime = (
                    document.getElementById(
                      'edit-modal-start-time'
                    ) as HTMLInputElement
                  )?.value;
                  const endTime = (
                    document.getElementById(
                      'edit-modal-end-time'
                    ) as HTMLInputElement
                  )?.value;

                  if (!startTime || !endTime) return;

                  editSession(
                    editModalData.sessionId,
                    editModalData.enrollmentId,
                    weekday,
                    startTime,
                    endTime
                  );
                  setShowEditModal(false);
                }}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
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
