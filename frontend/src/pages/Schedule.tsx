import { useEffect, useMemo, useState } from 'react';
import type { Enrollment, Session, Subject, Student } from '../lib/planner';
import {
  weekdays,
  DAY_END_MIN,
  DAY_START_MIN,
  timeToMinutes,
  minutesToTime,
} from '../lib/planner';
import Button from '../components/atoms/Button';
import Label from '../components/atoms/Label';
import Card from '../components/molecules/Card';

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

  // 시간별로 겹치는 세션을 y축으로 배치하는 함수
  function getSessionPosition(session: Session, weekday: number) {
    const daySessions = displaySessions.get(weekday) || [];

    // 같은 요일에서 시간이 겹치는 세션들을 찾기
    const overlappingSessions = daySessions.filter(s => {
      if (s.id === session.id) return false;

      // 시간이 겹치는지 확인
      const sStart = timeToMinutes(s.startsAt);
      const sEnd = timeToMinutes(s.endsAt);
      const sessionStart = timeToMinutes(session.startsAt);
      const sessionEnd = timeToMinutes(session.endsAt);

      return sStart < sessionEnd && sessionStart < sEnd;
    });

    // 겹치는 세션이 없으면 0번째 위치
    if (overlappingSessions.length === 0) return 0;

    // ✅ 수정된 부분: 겹치는 세션 그룹의 순서로 Y축 위치 결정
    // 현재 세션을 포함한 모든 겹치는 세션들을 시간순으로 정렬
    const allOverlapping = [...overlappingSessions, session].sort(
      (a, b) => timeToMinutes(a.startsAt) - timeToMinutes(b.startsAt)
    );

    // 현재 세션이 정렬된 순서에서 몇 번째인지 찾기
    const sessionIndex = allOverlapping.findIndex(s => s.id === session.id);

    // 순서대로 Y축 위치 할당 (0, 1, 2...)
    return sessionIndex;
  }

  // 요일별 최대 y축 높이 계산
  function getWeekdayHeight(weekday: number) {
    const daySessions = displaySessions.get(weekday) || [];
    if (daySessions.length === 0) return 40; // 기본 높이

    let maxY = 0;
    daySessions.forEach(session => {
      const yOffset = getSessionPosition(session, weekday);
      maxY = Math.max(maxY, yOffset);
    });

    // 겹치는 세션이 없으면 기본 높이, 있으면 확장
    // maxY가 0이면 겹치는 세션이 없음, 1 이상이면 겹치는 세션이 있음
    return maxY === 0 ? 40 : 40 + (maxY + 1) * 32;
  }

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
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
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
    const enrollment = enrollments.find(e => e.id === session.enrollmentId);
    const student = students.find(s => s.id === enrollment?.studentId);
    const subject = subjects.find(sub => sub.id === enrollment?.subjectId);

    if (!enrollment || !student || !subject) return;

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

  // 시간표 드롭 처리
  function handleTimeTableDrop(
    e: React.DragEvent,
    weekday: number,
    timeSlot: number
  ) {
    e.preventDefault();
    const studentId = e.dataTransfer.getData('text/plain');
    if (!studentId) return;

    const hour = Math.floor(DAY_START_MIN / 60) + timeSlot;
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour + 1).padStart(2, '0')}:00`;

    setModalData({ studentId, weekday, startTime, endTime });
    setModalPos({ x: e.clientX, y: e.clientY + 20 });
    setShowModal(true);
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

  const hourCols = (DAY_END_MIN - DAY_START_MIN) / 60;

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

      {/* 가로 스크롤 가능한 래퍼: 시간축 X, 요일 Y */}
      <div
        className="grid grid-rows-header grid-cols-auto gap-grid"
        style={{
          gridTemplateColumns: `80px repeat(${hourCols}, 120px)`,
        }}
      >
        {/* 좌상단 빈칸 */}
        <div />
        {/* 시간 헤더 (9:00~24:00) */}
        {Array.from({ length: hourCols }, (_, i) => DAY_START_MIN + i * 60).map(
          min => (
            <div key={`h-${min}`} className="time-header">
              {minutesToTime(min)}
            </div>
          )
        )}

        {/* 요일 라벨 + 각 요일의 타임라인 */}
        {weekdays.map((w, dayIdx) => {
          const blocks = displaySessions.get(dayIdx) ?? [];
          return (
            <>
              <div key={`yl-${dayIdx}`} className="weekday-label">
                {w}
              </div>
              <div
                key={`row-${dayIdx}`}
                className="weekday-row"
                style={{
                  height: getWeekdayHeight(dayIdx),
                }}
              >
                {blocks.map((b, blockIndex) => {
                  const subj = subjects.find(
                    s =>
                      s.id ===
                      enrollments.find(e => e.id === b.enrollmentId)?.subjectId
                  );
                  const left =
                    ((timeToMinutes(b.startsAt) - DAY_START_MIN) / 60) * 120;
                  const width =
                    ((timeToMinutes(b.endsAt) - timeToMinutes(b.startsAt)) /
                      60) *
                    120;
                  const yOffset = getSessionPosition(b, dayIdx) * 32; // 겹치는 세션을 y축으로 배치

                  // 디버깅용 로그
                  console.log(
                    `Session ${b.id} on day ${dayIdx}: yOffset = ${yOffset}, position = ${yOffset / 32}`
                  );

                  return (
                    <div
                      key={`${b.id}-${dayIdx}-${blockIndex}-${yOffset}`}
                      className="session-block"
                      style={{
                        left,
                        top: 6 + yOffset,
                        width,
                        background: subj?.color ?? '#888',
                        zIndex: yOffset + 1, // 겹치는 세션이 위에 보이도록
                      }}
                      onClick={() => openEditModal(b)} // 클릭 시 편집 모달 열기
                    >
                      {subj?.name} {b.startsAt}-{b.endsAt}
                    </div>
                  );
                })}

                {/* 드롭 영역 */}
                {Array.from({ length: hourCols }, (_, hourIdx) => (
                  <div
                    key={`drop-${dayIdx}-${hourIdx}`}
                    className="drop-zone position-absolute"
                    style={{
                      left: hourIdx * 120,
                      top: 0,
                      width: 120,
                      height: getWeekdayHeight(dayIdx), // 동적 높이 적용
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      handleTimeTableDrop(e, dayIdx, hourIdx);
                      // 드롭 후 점선 테두리 제거
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                    onDragEnter={e => {
                      e.currentTarget.classList.add('drag-over');
                    }}
                    onDragLeave={e => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                  />
                ))}
              </div>
            </>
          );
        })}
      </div>

      {/* 플로팅 학생 리스트 패널 */}
      <div
        className="floating-panel position-fixed z-1000 overflow-auto"
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
          className={`panel-header ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
        <ul className="student-list">
          {students.map(s => (
            <li key={s.id}>
              <div
                draggable
                className={`student-item ${selectedStudentId === s.id ? 'selected' : ''}`}
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
            </li>
          ))}
          {students.length === 0 && (
            <li style={{ color: 'var(--color-gray-400)', padding: '8px 12px' }}>
              학생 페이지에서 학생을 추가하세요
            </li>
          )}
        </ul>
      </div>

      {/* 과목 선택 및 시간 설정 모달 */}
      {showModal && (
        <Card
          title="수업 추가"
          variant="elevated"
          padding="large"
          className="modal-overlay position-fixed z-1000"
          style={{
            left: modalPos.x,
            top: modalPos.y,
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
            <Button variant="secondary" onClick={() => setShowModal(false)}>
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
        <div
          className="modal-overlay position-fixed z-1000"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: 8,
            padding: 16,
            minWidth: 320,
          }}
        >
          <h4 className="modal-header">수업 편집</h4>
          <div className="modal-form">
            <div className="form-group">
              <label className="form-label">학생</label>
              <div
                className="form-input"
                style={{ background: 'var(--color-gray-700)' }}
              >
                {students.find(s => s.id === editModalData.studentId)?.name}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">과목</label>
              <div
                className="form-input"
                style={{ background: 'var(--color-gray-700)' }}
              >
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
          <div
            className="modal-actions"
            style={{ justifyContent: 'space-between' }}
          >
            <Button
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
              <Button onClick={() => setShowEditModal(false)}>취소</Button>
              <Button
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
