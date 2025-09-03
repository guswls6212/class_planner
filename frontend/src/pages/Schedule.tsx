import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../components/atoms/Button';
import Label from '../components/atoms/Label';
import TimeTableGrid from '../components/organisms/TimeTableGrid';
import { downloadTimetableAsPDF } from '../lib/pdf-utils';
import type { Enrollment, Session, Student, Subject } from '../lib/planner';
import {
  canFormGroupSession,
  createGroupSession,
  mergeIntoGroupSession,
  weekdays,
} from '../lib/planner';
import styles from './Schedule.module.css';

// 🆕 그룹 수업을 위한 새로운 타입
type GroupSessionData = {
  studentIds: string[]; // 여러 학생 ID 배열로 변경
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string;
};

function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });

  const setValueWithStorage = (newValue: T | ((prev: T) => T)) => {
    const finalValue =
      typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(value)
        : newValue;
    setValue(finalValue);
    localStorage.setItem(key, JSON.stringify(finalValue));
  };

  return [value, setValueWithStorage] as const;
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

  // 🆕 selectedStudentId 변경 감지
  useEffect(() => {
    console.log('🆕 selectedStudentId 변경됨:', selectedStudentId);
  }, [selectedStudentId]);

  // 🆕 학생 데이터 디버깅
  useEffect(() => {
    console.log('🆕 학생 데이터 상태:', {
      studentsCount: students.length,
      filteredStudentsCount: filteredStudents.length,
      searchQuery,
    });
  }, [students, filteredStudents, searchQuery]);

  // 🆕 선택된 학생이 있으면 해당 학생의 세션만, 없으면 전체 세션 표시
  const displaySessions = useMemo(() => {
    if (selectedStudentId) {
      // 🆕 enrollmentIds를 사용하여 선택된 학생의 세션만 필터링
      return new Map<number, Session[]>(
        sessions
          .filter(s =>
            s.enrollmentIds.some(enrollmentId => {
              const enrollment = enrollments.find(e => e.id === enrollmentId);
              return enrollment?.studentId === selectedStudentId;
            })
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
  }, [sessions, enrollments, selectedStudentId]);

  // 🆕 그룹 수업 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupSessionData>({
    studentIds: [], // 빈 배열로 초기화
    subjectId: '',
    weekday: 0,
    startTime: '',
    endTime: '',
  });

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState('');

  // 🆕 모달용 학생 검색 결과
  const filteredStudentsForModal = useMemo(() => {
    if (!studentInputValue.trim()) return [];
    return students.filter(student =>
      student.name.toLowerCase().includes(studentInputValue.toLowerCase())
    );
  }, [students, studentInputValue]);

  // 🆕 수업 편집 모달용 학생 입력 상태
  const [editStudentInputValue, setEditStudentInputValue] = useState('');

  // 🆕 수업 편집 모달용 시간 상태
  const [editModalTimeData, setEditModalTimeData] = useState({
    startTime: '',
    endTime: '',
  });

  // 🆕 수업 편집 모달용 시작 시간 변경 처리
  const handleEditStartTimeChange = (newStartTime: string) => {
    setEditModalTimeData(prev => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 종료 시간을 자동으로 조정
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        const startMinutes =
          parseInt(newStartTime.split(':')[0]) * 60 +
          parseInt(newStartTime.split(':')[1]);
        const newEndMinutes = startMinutes + 60; // 1시간 후
        const newEndHour = Math.floor(newEndMinutes / 60);
        const newEndMinute = newEndMinutes % 60;
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;

        return {
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 수업 편집 모달용 종료 시간 변경 처리
  const handleEditEndTimeChange = (newEndTime: string) => {
    setEditModalTimeData(prev => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 시작 시간을 자동으로 조정
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        const endMinutes =
          parseInt(newEndTime.split(':')[0]) * 60 +
          parseInt(newEndTime.split(':')[1]);
        const newStartMinutes = endMinutes - 60; // 1시간 전
        const newStartHour = Math.floor(newStartMinutes / 60);
        const newStartMinute = newStartMinutes % 60;
        const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;

        return {
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 수업 편집 모달용 학생 추가 함수
  const handleEditStudentAdd = (studentId?: string) => {
    const targetStudentId =
      studentId ||
      students.find(
        s => s.name.toLowerCase() === editStudentInputValue.toLowerCase()
      )?.id;

    if (!targetStudentId) {
      // 존재하지 않는 학생인 경우 입력창을 초기화하지 않고 피드백만 제공
      return;
    }

    // 이미 추가된 학생인지 확인
    const isAlreadyAdded = editModalData?.enrollmentIds?.some(enrollmentId => {
      const enrollment = enrollments.find(e => e.id === enrollmentId);
      return enrollment?.studentId === targetStudentId;
    });

    if (isAlreadyAdded) {
      // 이미 추가된 학생인 경우 입력창을 초기화하지 않음
      return;
    }

    // enrollment가 있는지 확인하고 없으면 생성
    let enrollment = enrollments.find(
      e =>
        e.studentId === targetStudentId &&
        e.subjectId ===
          (() => {
            const firstEnrollment = enrollments.find(
              e => e.id === editModalData?.enrollmentIds?.[0]
            );
            return firstEnrollment?.subjectId || '';
          })()
    );

    if (!enrollment) {
      enrollment = {
        id: crypto.randomUUID(),
        studentId: targetStudentId,
        subjectId: (() => {
          const firstEnrollment = enrollments.find(
            e => e.id === editModalData?.enrollmentIds?.[0]
          );
          return firstEnrollment?.subjectId || '';
        })(),
      };
      setEnrollments(prev => [...prev, enrollment!]);
    }

    // enrollmentIds에 추가 (최대 14명 제한)
    if (
      editModalData &&
      !editModalData.enrollmentIds?.includes(enrollment.id)
    ) {
      // 🆕 최대 14명 제한 확인
      const currentCount = editModalData.enrollmentIds?.length || 0;
      if (currentCount >= 14) {
        alert('최대 14명까지 추가할 수 있습니다.');
        return;
      }

      setEditModalData(prev =>
        prev
          ? {
              ...prev,
              enrollmentIds: [...(prev.enrollmentIds || []), enrollment!.id],
            }
          : null
      );
      // 성공적으로 추가된 경우에만 입력창 초기화
      setEditStudentInputValue('');
    }
  };

  // 🆕 학생 추가 함수 (최대 14명 제한)
  const addStudent = (studentId: string) => {
    if (!groupModalData.studentIds.includes(studentId)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert('최대 14명까지 추가할 수 있습니다.');
        return;
      }

      setGroupModalData(prev => ({
        ...prev,
        studentIds: [...prev.studentIds, studentId],
      }));
    }
    setStudentInputValue('');
  };

  // 🆕 학생 제거 함수
  const removeStudent = (studentId: string) => {
    setGroupModalData(prev => ({
      ...prev,
      studentIds: prev.studentIds.filter(id => id !== studentId),
    }));
  };

  // 🆕 입력창에서 학생 추가 함수 (최대 14명 제한)
  const addStudentFromInput = () => {
    const trimmedValue = studentInputValue.trim();
    if (!trimmedValue) return;

    // 정확한 이름으로 학생 찾기
    const student = students.find(s => s.name === trimmedValue);
    if (student && !groupModalData.studentIds.includes(student.id)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        alert('최대 14명까지 추가할 수 있습니다.');
        return;
      }
      addStudent(student.id);
    }
  };

  // 🆕 입력창 키보드 이벤트 처리
  const handleStudentInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStudentFromInput();
    }
  };

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = (data: GroupSessionData) => {
    // 시간 유효성 검사
    if (!validateTimeRange(data.startTime, data.endTime)) {
      alert('시작 시간은 종료 시간보다 빨라야 합니다.');
      return;
    }

    // 🆕 그룹 수업 판단 및 처리 (첫 번째 학생 기준)
    const { canForm, existingSessionId } = canFormGroupSession(
      {
        studentId: data.studentIds[0], // 첫 번째 학생 ID 사용
        subjectId: data.subjectId,
        weekday: data.weekday,
        startsAt: data.startTime,
        endsAt: data.endTime,
        room: data.room,
      },
      sessions,
      enrollments
    );

    if (canForm && existingSessionId) {
      // 🆕 기존 세션에 학생 추가 (그룹 수업)
      const existingSession = sessions.find(s => s.id === existingSessionId);
      if (existingSession) {
        const updatedSession = mergeIntoGroupSession(
          {
            studentId: data.studentIds[0], // 첫 번째 학생 ID 사용
            subjectId: data.subjectId,
            weekday: data.weekday,
            startsAt: data.startTime,
            endsAt: data.endTime,
            room: data.room,
          },
          existingSession,
          enrollments
        );

        setSessions(prev =>
          prev.map(s => (s.id === existingSessionId ? updatedSession : s))
        );
      }
    } else {
      // 🆕 새로운 세션 생성
      // enrollment가 없으면 자동으로 생성
      let enrollment = enrollments.find(
        e =>
          e.studentId === data.studentIds[0] && e.subjectId === data.subjectId
      );

      if (!enrollment) {
        // enrollment가 없으면 새로 생성
        const newEnrollment: Enrollment = {
          id: crypto.randomUUID(),
          studentId: data.studentIds[0],
          subjectId: data.subjectId,
        };

        // enrollments에 추가
        setEnrollments(prev => [...prev, newEnrollment]);
        enrollment = newEnrollment;
      }

      const newSession = createGroupSession(
        {
          studentId: data.studentIds[0], // 첫 번째 학생 ID 사용
          subjectId: data.subjectId,
          weekday: data.weekday,
          startsAt: data.startTime,
          endsAt: data.endTime,
          room: data.room,
        },
        [...enrollments, enrollment] // 새로 생성된 enrollment 포함
      );

      setSessions(prev => [...prev, newSession]);
    }

    setShowGroupModal(false);
  };

  // 🆕 그룹 수업 모달 열기
  const openGroupModal = (weekday: number, time: string) => {
    console.log('🆕 그룹 수업 모달 열기:', { weekday, time });
    setGroupModalData({
      studentIds: [], // 빈 배열로 초기화
      subjectId: '',
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });
    setShowGroupModal(true);
    console.log('🆕 모달 상태 설정 완료:', { showGroupModal: true });
  };

  // 🆕 시간 유효성 검사 함수
  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;

    const startMinutes =
      parseInt(startTime.split(':')[0]) * 60 +
      parseInt(startTime.split(':')[1]);
    const endMinutes =
      parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);

    return startMinutes < endMinutes;
  };

  // 🆕 시작 시간 변경 처리 (종료 시간보다 늦지 않도록)
  const handleStartTimeChange = (newStartTime: string) => {
    setGroupModalData(prev => {
      const currentEndTime = prev.endTime;

      // 시작 시간이 종료 시간보다 늦으면 종료 시간을 자동으로 조정
      if (
        newStartTime &&
        currentEndTime &&
        !validateTimeRange(newStartTime, currentEndTime)
      ) {
        const startMinutes =
          parseInt(newStartTime.split(':')[0]) * 60 +
          parseInt(newStartTime.split(':')[1]);
        const newEndMinutes = startMinutes + 60; // 1시간 후
        const newEndHour = Math.floor(newEndMinutes / 60);
        const newEndMinute = newEndMinutes % 60;
        const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;

        return {
          ...prev,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }

      return {
        ...prev,
        startTime: newStartTime,
      };
    });
  };

  // 🆕 종료 시간 변경 처리 (시작 시간보다 빠르지 않도록)
  const handleEndTimeChange = (newEndTime: string) => {
    setGroupModalData(prev => {
      const currentStartTime = prev.startTime;

      // 종료 시간이 시작 시간보다 빠르면 시작 시간을 자동으로 조정
      if (
        newEndTime &&
        currentStartTime &&
        !validateTimeRange(currentStartTime, newEndTime)
      ) {
        const endMinutes =
          parseInt(newEndTime.split(':')[0]) * 60 +
          parseInt(newEndTime.split(':')[1]);
        const newStartMinutes = endMinutes - 60; // 1시간 전
        const newStartHour = Math.floor(newStartMinutes / 60);
        const newStartMinute = newStartMinutes % 60;
        const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`;

        return {
          ...prev,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }

      return {
        ...prev,
        endTime: newEndTime,
      };
    });
  };

  // 🆕 다음 시간 계산
  const getNextHour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const nextHour = hours + 1;
    return `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 🆕 드래그 앤 드롭 처리
  const handleDrop = (weekday: number, time: string, enrollmentId: string) => {
    console.log('🆕 handleDrop 호출됨:', { weekday, time, enrollmentId });

    // 학생 ID인지 확인 (enrollment가 없는 경우)
    if (enrollmentId.startsWith('student:')) {
      const studentId = enrollmentId.replace('student:', '');
      console.log('🆕 학생 ID로 드롭됨:', studentId);

      // 학생 정보 찾기
      const student = students.find(s => s.id === studentId);
      if (!student) {
        console.log('🆕 학생을 찾을 수 없음:', studentId);
        return;
      }

      console.log('🆕 그룹 수업 모달 데이터 설정 (학생 ID):', {
        studentId,
        weekday,
        startTime: time,
        endTime: getNextHour(time),
      });

      // 🆕 그룹 수업 모달 열기 (과목은 선택되지 않은 상태)
      setGroupModalData({
        studentIds: [studentId],
        subjectId: '', // 과목은 선택되지 않은 상태
        weekday,
        startTime: time,
        endTime: getNextHour(time),
      });

      console.log('🆕 showGroupModal을 true로 설정');
      setShowGroupModal(true);
      return;
    }

    // 기존 enrollment 처리
    const enrollment = enrollments.find(e => e.id === enrollmentId);
    console.log('🆕 찾은 enrollment:', enrollment);

    if (!enrollment) {
      console.log('🆕 enrollment를 찾을 수 없음');
      return;
    }

    console.log('🆕 그룹 수업 모달 데이터 설정:', {
      studentId: enrollment.studentId,
      subjectId: enrollment.subjectId,
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });

    // 🆕 그룹 수업 모달 열기
    setGroupModalData({
      studentIds: [enrollment.studentId], // 배열로 변경
      subjectId: enrollment.subjectId,
      weekday,
      startTime: time,
      endTime: getNextHour(time),
    });

    console.log('🆕 showGroupModal을 true로 설정');
    setShowGroupModal(true);

    console.log('🆕 handleDrop 완료');
  };

  // 🆕 빈 공간 클릭 처리
  const handleEmptySpaceClick = (weekday: number, time: string) => {
    console.log('🆕 빈 공간 클릭됨:', { weekday, time });
    openGroupModal(weekday, time);
  };

  // 🆕 세션 편집 모달 상태
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<Session | null>(null);

  // 🆕 세션 클릭 처리
  const handleSessionClick = (session: Session) => {
    setEditModalData(session);
    setEditModalTimeData({
      startTime: session.startsAt,
      endTime: session.endsAt,
    });
    setShowEditModal(true);
  };

  // 🆕 PDF 다운로드 처리
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePDFDownload = async () => {
    if (!timeTableRef.current) return;

    setIsDownloading(true);
    try {
      // 선택된 학생 이름 찾기
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const studentName = selectedStudent?.name;

      await downloadTimetableAsPDF(timeTableRef.current, studentName);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // 학생 패널 위치 (드래그로 이동 가능) - 화면 정중앙에 표시
  const [panelPos, setPanelPos] = useLocal<{ x: number; y: number }>(
    'ui:studentsPanelPos',
    { x: 0, y: 0 } // 🆕 초기값을 0으로 설정하고 useEffect에서 계산
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // 🆕 패널을 화면 정중앙에 위치시키는 useEffect
  useEffect(() => {
    // 패널이 처음 로딩될 때만 화면 정중앙에 위치
    const savedPos = localStorage.getItem('ui:studentsPanelPos');
    if (!savedPos) {
      // 저장된 위치가 없으면 화면 정중앙에 위치
      const panelWidth = 280; // 패널 너비
      const panelHeight = 400; // 패널 높이
      const centerX = (window.innerWidth - panelWidth) / 2;
      const centerY = (window.innerHeight - panelHeight) / 2;

      console.log('🆕 패널을 화면 정중앙에 위치:', { centerX, centerY });
      setPanelPos({ x: centerX, y: centerY });
    }
  }, [setPanelPos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelPos.x,
      y: e.clientY - panelPos.y,
    });
  };

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

      {/* 시간표 다운로드 버튼 - 원래 위치로 복원 */}
      <div style={{ marginBottom: '16px', textAlign: 'right' }}>
        <Button
          variant="primary"
          onClick={handlePDFDownload}
          disabled={isDownloading}
        >
          {isDownloading ? '다운로드 중...' : '시간표 다운로드'}
        </Button>
      </div>

      {/* 🆕 시간표 그리드 */}
      <div ref={timeTableRef}>
        <TimeTableGrid
          sessions={displaySessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onSessionClick={handleSessionClick}
          onDrop={handleDrop}
          onEmptySpaceClick={handleEmptySpaceClick}
          selectedStudentId={selectedStudentId} // 🆕 선택된 학생 ID 전달
        />
      </div>

      {/* 🆕 학생 패널 - 원래 위치로 복원 */}
      <div
        className={`${styles.floatingPanel} position-fixed overflow-auto`}
        style={{
          left: panelPos.x,
          top: panelPos.y,
          width: 280,
          maxHeight: '400px',
          padding: 16,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* 드래그 가능한 헤더 */}
        <div
          className={`${styles.panelHeader} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          data-testid="students-panel-header"
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
                data-testid={`student-item-${s.id}`}
                onDragStart={e => {
                  // 해당 학생의 첫 번째 enrollment ID를 찾아서 전달
                  const studentEnrollment = enrollments.find(
                    e => e.studentId === s.id
                  );
                  if (studentEnrollment) {
                    console.log(
                      '🆕 드래그 시작 - enrollment ID 전달:',
                      studentEnrollment.id
                    );
                    e.dataTransfer.setData('text/plain', studentEnrollment.id);
                  } else {
                    console.log(
                      '🆕 드래그 시작 - 학생 ID 전달 (enrollment 없음):',
                      s.id
                    );
                    // enrollment가 없으면 학생 ID를 직접 전달
                    e.dataTransfer.setData('text/plain', `student:${s.id}`);
                  }
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onMouseDown={() => {
                  console.log('🆕 학생 onMouseDown 이벤트:', {
                    studentId: s.id,
                    currentSelectedId: selectedStudentId,
                    isDragging,
                  });

                  // 드래그 중이 아닐 때만 클릭 이벤트 처리
                  if (!isDragging) {
                    if (selectedStudentId === s.id) {
                      // 이미 선택된 학생이면 선택 해제
                      console.log('🆕 선택 해제:', s.id);
                      setSelectedStudentId('');
                    } else {
                      // 새로운 학생 선택
                      console.log('🆕 새로운 학생 선택:', s.id);
                      setSelectedStudentId(s.id);
                    }
                  } else {
                    console.log('🆕 드래그 중이므로 클릭 이벤트 무시');
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

      {/* 그룹 수업 추가 모달 */}
      {showGroupModal && (
        <div className="modal-backdrop">
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h4 className={styles.modalTitle}>수업 추가</h4>
              <div className={styles.modalForm}>
                <div className="form-group">
                  <Label htmlFor="modal-student" required>
                    학생
                  </Label>
                  <div className={styles.studentTagsContainer}>
                    {/* 선택된 학생 태그들 */}
                    {groupModalData.studentIds.map(studentId => {
                      const student = students.find(s => s.id === studentId);
                      return student ? (
                        <span key={studentId} className={styles.studentTag}>
                          {student.name}
                          <button
                            type="button"
                            className={styles.removeStudentBtn}
                            onClick={() => removeStudent(studentId)}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className={styles.studentInputContainer}>
                    <input
                      id="modal-student-input"
                      type="text"
                      className="form-input"
                      placeholder="학생 이름을 입력하세요"
                      value={studentInputValue}
                      onChange={e => setStudentInputValue(e.target.value)}
                      onKeyDown={handleStudentInputKeyDown}
                    />
                    <button
                      type="button"
                      className={styles.addStudentBtn}
                      onClick={addStudentFromInput}
                      disabled={!studentInputValue.trim()}
                    >
                      추가
                    </button>
                  </div>
                  {/* 학생 검색 결과 */}
                  {studentInputValue && (
                    <div className={styles.studentSearchResults}>
                      {(() => {
                        const filteredStudents =
                          filteredStudentsForModal.filter(
                            student =>
                              !groupModalData.studentIds.includes(student.id)
                          );

                        if (filteredStudents.length === 0) {
                          const studentExists = students.some(
                            s =>
                              s.name.toLowerCase() ===
                              studentInputValue.toLowerCase()
                          );

                          console.log('🔍 그룹 모달 학생 검색 디버깅:', {
                            studentInputValue,
                            filteredStudentsLength: filteredStudents.length,
                            studentExists,
                            totalStudents: students.length,
                          });

                          return (
                            <div className={styles.noSearchResults}>
                              <span>검색 결과가 없습니다</span>
                              {!studentExists && (
                                <span className={styles.studentNotFound}>
                                  (존재하지 않는 학생입니다)
                                </span>
                              )}
                            </div>
                          );
                        }

                        return filteredStudents.map(student => (
                          <div
                            key={student.id}
                            className={styles.studentSearchItem}
                            onClick={() => addStudent(student.id)}
                          >
                            {student.name}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-subject" required>
                    과목
                  </Label>
                  <select
                    id="modal-subject"
                    className="form-select"
                    value={groupModalData.subjectId}
                    onChange={e =>
                      setGroupModalData(prev => ({
                        ...prev,
                        subjectId: e.target.value,
                      }))
                    }
                    disabled={groupModalData.studentIds.length === 0}
                  >
                    <option value="">
                      {groupModalData.studentIds.length === 0
                        ? '먼저 학생을 선택하세요'
                        : '과목을 선택하세요'}
                    </option>
                    {groupModalData.studentIds.length > 0 &&
                      subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
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
                    value={groupModalData.weekday}
                    onChange={e =>
                      setGroupModalData(prev => ({
                        ...prev,
                        weekday: Number(e.target.value),
                      }))
                    }
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
                    value={groupModalData.startTime}
                    onChange={e => handleStartTimeChange(e.target.value)}
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
                    value={groupModalData.endTime}
                    onChange={e => handleEndTimeChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <Label htmlFor="modal-room">강의실</Label>
                  <input
                    id="modal-room"
                    type="text"
                    className="form-input"
                    placeholder="강의실 (선택사항)"
                    value={groupModalData.room || ''}
                    onChange={e =>
                      setGroupModalData(prev => ({
                        ...prev,
                        room: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  variant="transparent"
                  onClick={() => setShowGroupModal(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={() => addGroupSession(groupModalData)}
                  disabled={
                    groupModalData.studentIds.length === 0 ||
                    !groupModalData.subjectId ||
                    !groupModalData.startTime ||
                    !groupModalData.endTime
                  }
                >
                  추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 세션 편집 모달 */}
      {showEditModal && editModalData && (
        <div className="modal-backdrop">
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h4 className={styles.modalTitle}>수업 편집</h4>
              <div className={styles.modalForm}>
                <div className="form-group">
                  <Label htmlFor="edit-modal-students" required>
                    학생
                  </Label>
                  <div className={styles.studentTagsContainer}>
                    {/* 선택된 학생들을 태그로 표시 */}
                    {(() => {
                      const selectedStudents =
                        editModalData.enrollmentIds
                          ?.map(enrollmentId => {
                            const enrollment = enrollments.find(
                              e => e.id === enrollmentId
                            );
                            if (!enrollment) return null;
                            const student = students.find(
                              s => s.id === enrollment.studentId
                            );
                            return student
                              ? { id: student.id, name: student.name }
                              : null;
                          })
                          .filter(Boolean) || [];

                      return selectedStudents.map(student => (
                        <div key={student!.id} className={styles.studentTag}>
                          <span>{student!.name}</span>
                          <button
                            type="button"
                            className={styles.removeStudentBtn}
                            onClick={() => {
                              // 학생 제거 로직
                              const updatedEnrollmentIds =
                                editModalData.enrollmentIds?.filter(
                                  id =>
                                    id !==
                                    editModalData.enrollmentIds?.find(
                                      enrollmentId => {
                                        const enrollment = enrollments.find(
                                          e => e.id === enrollmentId
                                        );
                                        return (
                                          enrollment?.studentId === student!.id
                                        );
                                      }
                                    )
                                );
                              setEditModalData(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      enrollmentIds: updatedEnrollmentIds || [],
                                    }
                                  : null
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                  {/* 학생 추가 입력창 */}
                  <div className={styles.studentInputContainer}>
                    <input
                      type="text"
                      placeholder="학생 이름을 입력하세요"
                      className="form-input"
                      value={editStudentInputValue}
                      onChange={e => setEditStudentInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditStudentAdd();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.addStudentBtn}
                      onClick={() => handleEditStudentAdd()}
                      disabled={!editStudentInputValue.trim()}
                    >
                      추가
                    </button>
                  </div>
                  {/* 🆕 실시간 학생 검색 결과 */}
                  {editStudentInputValue.trim() && (
                    <div className={styles.studentSearchResults}>
                      {(() => {
                        const filteredStudents = students.filter(
                          student =>
                            student.name
                              .toLowerCase()
                              .includes(editStudentInputValue.toLowerCase()) &&
                            !editModalData.enrollmentIds?.some(enrollmentId => {
                              const enrollment = enrollments.find(
                                e => e.id === enrollmentId
                              );
                              return enrollment?.studentId === student.id;
                            })
                        );

                        if (filteredStudents.length === 0) {
                          return (
                            <div className={styles.noSearchResults}>
                              <span>검색 결과가 없습니다</span>
                              {!students.some(
                                s =>
                                  s.name.toLowerCase() ===
                                  editStudentInputValue.toLowerCase()
                              ) && (
                                <span className={styles.studentNotFound}>
                                  (존재하지 않는 학생입니다)
                                </span>
                              )}
                            </div>
                          );
                        }

                        return filteredStudents.map(student => (
                          <div
                            key={student.id}
                            className={styles.studentSearchItem}
                            onClick={() => {
                              handleEditStudentAdd(student.id);
                            }}
                          >
                            {student.name}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <Label htmlFor="edit-modal-subject" required>
                    과목
                  </Label>
                  <select
                    id="edit-modal-subject"
                    className="form-select"
                    value={(() => {
                      const enrollment = enrollments.find(
                        e => e.id === editModalData.enrollmentIds?.[0]
                      );
                      return enrollment?.subjectId || '';
                    })()}
                    onChange={e => {
                      const subjectId = e.target.value;

                      // 과목이 변경되면 기존 enrollment들을 새로운 과목으로 업데이트
                      if (editModalData?.enrollmentIds) {
                        const updatedEnrollments = enrollments.map(
                          enrollment => {
                            if (
                              editModalData.enrollmentIds?.includes(
                                enrollment.id
                              )
                            ) {
                              return { ...enrollment, subjectId };
                            }
                            return enrollment;
                          }
                        );
                        setEnrollments(updatedEnrollments);
                      }
                    }}
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
                    value={editModalTimeData.startTime}
                    onChange={e => handleEditStartTimeChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">종료 시간</label>
                  <input
                    id="edit-modal-end-time"
                    type="time"
                    className="form-input"
                    value={editModalTimeData.endTime}
                    onChange={e => handleEditEndTimeChange(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm('정말로 이 수업을 삭제하시겠습니까?')) {
                      setSessions(prev =>
                        prev.filter(s => s.id !== editModalData.id)
                      );
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
                      const startTime = editModalTimeData.startTime;
                      const endTime = editModalTimeData.endTime;

                      if (!startTime || !endTime) return;

                      // 시간 유효성 검사
                      if (!validateTimeRange(startTime, endTime)) {
                        alert('시작 시간은 종료 시간보다 빨라야 합니다.');
                        return;
                      }

                      // 세션 업데이트 (enrollmentIds 포함)
                      setSessions(prev =>
                        prev.map(s =>
                          s.id === editModalData.id
                            ? {
                                ...s,
                                weekday,
                                startsAt: startTime,
                                endsAt: endTime,
                                enrollmentIds:
                                  editModalData.enrollmentIds || [], // 🆕 enrollmentIds 업데이트 추가
                              }
                            : s
                        )
                      );

                      // enrollment 업데이트 (과목 변경 시)
                      const currentSubjectId = (() => {
                        const firstEnrollment = enrollments.find(
                          e => e.id === editModalData.enrollmentIds?.[0]
                        );
                        return firstEnrollment?.subjectId || '';
                      })();

                      if (currentSubjectId) {
                        const updatedEnrollments = enrollments.map(
                          enrollment => {
                            if (
                              editModalData.enrollmentIds?.includes(
                                enrollment.id
                              )
                            ) {
                              return {
                                ...enrollment,
                                subjectId: currentSubjectId,
                              };
                            }
                            return enrollment;
                          }
                        );
                        setEnrollments(updatedEnrollments);
                      }

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
      {/* This modal is now handled by handleEmptySpaceClick */}
      {/* {showEmptySpaceModal && (
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
      )} */}
    </div>
  );
}
