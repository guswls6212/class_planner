import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../components/atoms/Button';
import Label from '../components/atoms/Label';
import TimeTableGrid from '../components/organisms/TimeTableGrid';
import { downloadTimetableAsPDF } from '../lib/pdf-utils';
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

  // PDF 다운로드 관련
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // PDF 다운로드 함수
  const handlePDFDownload = async () => {
    if (!timeTableRef.current) return;

    try {
      setIsDownloading(true);

      // 선택된 학생 이름 가져오기
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const studentName = selectedStudent?.name;

      // 시간표를 PDF로 다운로드
      await downloadTimetableAsPDF(timeTableRef.current, studentName);

      console.log('PDF 다운로드 완료!');
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert('PDF 다운로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    studentId: '',
    weekday: 0,
    startTime: '',
    endTime: '',
  });

  // 빈 공간 클릭 모달 상태
  const [showEmptySpaceModal, setShowEmptySpaceModal] = useState(false);
  const [emptySpaceModalData, setEmptySpaceModalData] = useState({
    weekday: 0,
    startTime: '',
    endTime: '',
    studentId: '',
    subjectId: '',
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

  // 빈 공간 클릭 핸들러
  function handleEmptySpaceClick(weekday: number, time: string) {
    setEmptySpaceModalData({
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      studentId: '',
      subjectId: '',
    });
    setShowEmptySpaceModal(true);
  }

  // 다음 시간 계산 함수
  function getNextHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const nextHour = hours + 1;
    return `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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

      {/* 시간표 다운로드 버튼 */}
      <div style={{ marginBottom: '16px', textAlign: 'right' }}>
        <Button
          variant="primary"
          onClick={handlePDFDownload}
          disabled={isDownloading}
        >
          {isDownloading ? '다운로드 중...' : '시간표 다운로드'}
        </Button>
      </div>

      {/* TimeTableGrid 컴포넌트 사용 */}
      <div ref={timeTableRef}>
        <TimeTableGrid
          sessions={displaySessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
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
          onEmptySpaceClick={handleEmptySpaceClick}
        />
      </div>

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
        <div className="modal-backdrop">
          <div className="modal-overlay">
            <div className="modal-content">
              <h4 className="modal-title">수업 추가</h4>
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
                <Button
                  variant="transparent"
                  onClick={() => setShowModal(false)}
                >
                  취소
                </Button>
                <Button variant="primary" onClick={handleModalSubmit}>
                  추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      {showEditModal && editModalData && (
        <div className="modal-backdrop">
          <div className="modal-overlay">
            <div className="modal-content">
              <h4 className="modal-title">수업 편집</h4>
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">학생</label>
                  <div className="form-input form-input-disabled">
                    {students.find(s => s.id === editModalData.studentId)?.name}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">과목</label>
                  <div className="form-input form-input-disabled">
                    {subjects.find(s => s.id === editModalData.subjectId)?.name}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">요일</label>
                  <select
                    id="edit-modal-weekday"
                    className="form-select"
                    defaultValue={editModalData.weekday}
                  >
                    {weekdays.map((w, idx) => (
                      <option key={idx} value={idx}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">시작 시간</label>
                  <input
                    id="edit-modal-start-time"
                    type="time"
                    className="form-input"
                    defaultValue={editModalData.startTime}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">종료 시간</label>
                  <input
                    id="edit-modal-end-time"
                    type="time"
                    className="form-input"
                    defaultValue={editModalData.endTime}
                  />
                </div>
              </div>
              <div className="modal-actions">
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
          </div>
        </div>
      )}

      {/* 빈 공간 클릭 모달 */}
      {showEmptySpaceModal && (
        <div className="modal-backdrop">
          <div className="modal-overlay">
            <div className="modal-content">
              <h4 className="modal-title">수업 추가</h4>
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">
                    학생 <span className="required">*</span>
                  </label>
                  <select
                    id="empty-space-student"
                    className="form-select"
                    value={emptySpaceModalData.studentId}
                    onChange={e =>
                      setEmptySpaceModalData(prev => ({
                        ...prev,
                        studentId: e.target.value,
                      }))
                    }
                  >
                    <option value="">학생을 선택하세요</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    과목 <span className="required">*</span>
                  </label>
                  <select
                    id="empty-space-subject"
                    className="form-select"
                    value={emptySpaceModalData.subjectId}
                    onChange={e =>
                      setEmptySpaceModalData(prev => ({
                        ...prev,
                        subjectId: e.target.value,
                      }))
                    }
                  >
                    <option value="">과목을 선택하세요</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">시작 시간</label>
                  <input
                    id="empty-space-start-time"
                    type="time"
                    className="form-input"
                    value={emptySpaceModalData.startTime}
                    onChange={e =>
                      setEmptySpaceModalData(prev => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    종료 시간 <span className="required">*</span>
                  </label>
                  <input
                    id="empty-space-end-time"
                    type="time"
                    className="form-input"
                    value={emptySpaceModalData.endTime}
                    onChange={e =>
                      setEmptySpaceModalData(prev => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="modal-actions">
                <Button
                  variant="transparent"
                  onClick={() => setShowEmptySpaceModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (
                      !emptySpaceModalData.studentId ||
                      !emptySpaceModalData.subjectId ||
                      !emptySpaceModalData.endTime
                    ) {
                      alert('필수 항목을 모두 입력해주세요.');
                      return;
                    }

                    // 기존 수강 신청이 있는지 확인
                    let enrollment = enrollments.find(
                      e =>
                        e.studentId === emptySpaceModalData.studentId &&
                        e.subjectId === emptySpaceModalData.subjectId
                    );

                    // 없으면 새로 생성
                    if (!enrollment) {
                      enrollment = {
                        id: crypto.randomUUID(),
                        studentId: emptySpaceModalData.studentId,
                        subjectId: emptySpaceModalData.subjectId,
                      };
                      setEnrollments(prev => [...prev, enrollment!]);
                    }

                    // 세션 추가
                    addSession(
                      enrollment.id,
                      emptySpaceModalData.weekday,
                      emptySpaceModalData.startTime,
                      emptySpaceModalData.endTime
                    );

                    setShowEmptySpaceModal(false);
                  }}
                >
                  추가
                </Button>
              </div>
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
