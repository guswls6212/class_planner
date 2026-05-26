import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OwnerTeacherCard } from "../OwnerTeacherCard";

const mockUseMyRole = vi.fn();
vi.mock("@/hooks/useMyRole", () => ({
  useMyRole: () => mockUseMyRole(),
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseIntegratedDataLocal = vi.fn();
vi.mock("@/hooks/useIntegratedDataLocal", () => ({
  useIntegratedDataLocal: () => mockUseIntegratedDataLocal(),
}));

const mockAddTeacherSubject = vi.fn();
const mockRemoveTeacherSubject = vi.fn();
vi.mock("@/hooks/useTeacherManagementLocal", () => ({
  useTeacherManagementLocal: () => ({
    addTeacherSubject: mockAddTeacherSubject,
    removeTeacherSubject: mockRemoveTeacherSubject,
  }),
}));

const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
vi.mock("@/lib/toast", () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
}));

const OWNER_TEACHER_ID = "teacher-owner-1";
const ENGLISH_SUBJECT = { id: "sub-eng", name: "영어", color: "#fbbf24" };
const MATH_SUBJECT = { id: "sub-math", name: "수학", color: "#60a5fa" };
const KOREAN_SUBJECT = { id: "sub-kor", name: "국어", color: "#a78bfa" };

beforeEach(() => {
  mockAddTeacherSubject.mockReset();
  mockRemoveTeacherSubject.mockReset();
  mockShowError.mockReset();
  mockShowSuccess.mockReset();
  mockAddTeacherSubject.mockResolvedValue(true);
  mockRemoveTeacherSubject.mockResolvedValue(true);

  mockUseAuth.mockReturnValue({
    session: { user: { id: "user-1", email: "owner@test.local" } },
    user: { id: "user-1", email: "owner@test.local" },
    loading: false,
  });
  mockUseMyRole.mockReturnValue({
    role: "owner",
    linkedTeacherId: OWNER_TEACHER_ID,
    canManage: true,
    academies: [],
    isLoading: false,
    linkedTeacherName: null,
    linkedTeacherColor: null,
    adminCount: 1,
  });
  mockUseIntegratedDataLocal.mockReturnValue({
    data: {
      teachers: [
        {
          id: OWNER_TEACHER_ID,
          name: "홍길동",
          color: "#fbbf24",
          subjectIds: [ENGLISH_SUBJECT.id, MATH_SUBJECT.id],
        },
        { id: "teacher-2", name: "김선생", color: "#10b981", subjectIds: [] },
      ],
      subjects: [ENGLISH_SUBJECT, MATH_SUBJECT, KOREAN_SUBJECT],
    },
  });
});

describe("OwnerTeacherCard", () => {
  it("role 이 owner 가 아니면 null 반환", () => {
    mockUseMyRole.mockReturnValue({
      role: "admin",
      linkedTeacherId: OWNER_TEACHER_ID,
      canManage: false,
      academies: [],
      isLoading: false,
      linkedTeacherName: null,
      linkedTeacherColor: null,
      adminCount: 0,
    });
    const { container } = render(<OwnerTeacherCard />);
    expect(container.firstChild).toBeNull();
  });

  it("role 이 owner 이고 linkedTeacherId 가 있을 때 카드 render + 직접 수업 가능 badge 표시", () => {
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId("owner-teacher-card")).toBeInTheDocument();
    expect(screen.getByText(/원장님 \(홍길동\)/)).toBeInTheDocument();
    expect(screen.getByText("원장")).toBeInTheDocument();
    expect(screen.getByTestId("owner-direct-teach-badge")).toBeInTheDocument();
  });

  it("linkedTeacherId 가 null 이어도 owner 면 카드 render (Part 2: first-time setup 안내)", () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      linkedTeacherId: null,
      canManage: true,
      academies: [],
      isLoading: false,
      linkedTeacherName: null,
      linkedTeacherColor: null,
      adminCount: 1,
    });
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId("owner-teacher-card")).toBeInTheDocument();
    expect(screen.getByText(/원장님 \(owner\)/)).toBeInTheDocument();
    expect(screen.queryByTestId("owner-direct-teach-badge")).toBeNull();
    expect(screen.getByText(/담당 과목을 설정하면 강사 목록에 표시/)).toBeInTheDocument();
  });

  it("담당 과목 chip 표시 (영어/수학)", () => {
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId(`owner-subject-${ENGLISH_SUBJECT.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`owner-subject-${MATH_SUBJECT.id}`)).toBeInTheDocument();
  });

  it("담당 과목 비어 있으면 '아직 설정 안 됨' 표시", () => {
    mockUseIntegratedDataLocal.mockReturnValue({
      data: {
        teachers: [{ id: OWNER_TEACHER_ID, name: "홍길동", color: "#fbbf24", subjectIds: [] }],
        subjects: [ENGLISH_SUBJECT, MATH_SUBJECT],
      },
    });
    render(<OwnerTeacherCard />);
    expect(screen.getByText("아직 설정 안 됨")).toBeInTheDocument();
  });

  it("'과목 변경' 버튼 always 표시", () => {
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId("owner-change-subjects")).toBeInTheDocument();
  });

  it("'과목 변경' 버튼 click → SubjectPickModal 열림", () => {
    render(<OwnerTeacherCard />);
    expect(screen.queryByTestId("subject-pick-modal")).toBeNull();
    fireEvent.click(screen.getByTestId("owner-change-subjects"));
    expect(screen.getByTestId("subject-pick-modal")).toBeInTheDocument();
  });

  it("SubjectPickModal save (linkedTeacherId 있음) → addTeacherSubject 호출 + 성공 toast", async () => {
    render(<OwnerTeacherCard />);
    fireEvent.click(screen.getByTestId("owner-change-subjects"));
    // 추가: 국어 (sub-kor) 선택 — 이전 선택 영어+수학 + 국어 = add 국어, remove 0
    fireEvent.click(screen.getByTestId(`subject-pick-${KOREAN_SUBJECT.id}`));
    fireEvent.click(screen.getByTestId("subject-pick-save"));
    await waitFor(() => {
      expect(mockAddTeacherSubject).toHaveBeenCalledWith(OWNER_TEACHER_ID, KOREAN_SUBJECT.id);
    });
    expect(mockShowSuccess).toHaveBeenCalled();
  });

  it("SubjectPickModal save (linkedTeacherId 있음) → 제거된 과목 removeTeacherSubject 호출", async () => {
    render(<OwnerTeacherCard />);
    fireEvent.click(screen.getByTestId("owner-change-subjects"));
    // 영어 (sub-eng) 토글 — 이전 선택에서 제거
    fireEvent.click(screen.getByTestId(`subject-pick-${ENGLISH_SUBJECT.id}`));
    fireEvent.click(screen.getByTestId("subject-pick-save"));
    await waitFor(() => {
      expect(mockRemoveTeacherSubject).toHaveBeenCalledWith(OWNER_TEACHER_ID, ENGLISH_SUBJECT.id);
    });
  });

  it("SubjectPickModal save (linkedTeacherId 없음) → showError 호출 (Part 2b 안내)", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      linkedTeacherId: null,
      canManage: true,
      academies: [],
      isLoading: false,
      linkedTeacherName: null,
      linkedTeacherColor: null,
      adminCount: 1,
    });
    render(<OwnerTeacherCard />);
    fireEvent.click(screen.getByTestId("owner-change-subjects"));
    fireEvent.click(screen.getByTestId(`subject-pick-${ENGLISH_SUBJECT.id}`));
    fireEvent.click(screen.getByTestId("subject-pick-save"));
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
    });
    expect(mockAddTeacherSubject).not.toHaveBeenCalled();
  });

  it("teacher.name 없으면 user email prefix 로 fallback", () => {
    mockUseIntegratedDataLocal.mockReturnValue({
      data: {
        teachers: [{ id: OWNER_TEACHER_ID, name: "", color: "#fbbf24", subjectIds: [] }],
        subjects: [],
      },
    });
    render(<OwnerTeacherCard />);
    expect(screen.getByText(/원장님 \(owner\)/)).toBeInTheDocument();
  });
});
