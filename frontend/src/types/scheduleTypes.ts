import type { Session, Student } from '../lib/planner';

// 그룹 수업을 위한 타입
export interface GroupSessionData {
  studentIds: string[];
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string;
}

// 수업 편집 모달용 시간 데이터
export interface EditModalTimeData {
  startTime: string;
  endTime: string;
}

// 학생 패널 위치
export interface PanelPosition {
  x: number;
  y: number;
}

// 드래그 오프셋
export interface DragOffset {
  x: number;
  y: number;
}

// 모달 상태
export interface ModalState {
  showGroupModal: boolean;
  showEditModal: boolean;
}

// 학생 검색 결과
export interface StudentSearchResult {
  students: Student[];
  query: string;
}

// 시간표 표시 세션
export interface DisplaySessions {
  sessions: Map<number, Session[]>;
  selectedStudentId: string | null;
}

// PDF 다운로드 상태
export interface PDFDownloadState {
  isDownloading: boolean;
  timeTableRef: React.RefObject<HTMLDivElement> | null;
}

// 학생 패널 상태
export interface StudentPanelState {
  position: PanelPosition;
  isDragging: boolean;
  dragOffset: DragOffset;
  searchQuery: string;
  filteredStudents: Student[];
}
