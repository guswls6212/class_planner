import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const OWNER_TEACHER_ID = "teacher-owner-1";
const ENGLISH_SUBJECT = { id: "sub-eng", name: "영어", color: "#fbbf24" };
const MATH_SUBJECT = { id: "sub-math", name: "수학", color: "#60a5fa" };

beforeEach(() => {
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
      subjects: [ENGLISH_SUBJECT, MATH_SUBJECT, { id: "sub-kor", name: "국어", color: "#a78bfa" }],
    },
  });
});

describe("OwnerTeacherCard", () => {
  it("role 이 owner 이고 linkedTeacherId 가 있을 때 카드 render", () => {
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId("owner-teacher-card")).toBeInTheDocument();
    expect(screen.getByText(/원장님 \(홍길동\)/)).toBeInTheDocument();
    expect(screen.getByText("원장")).toBeInTheDocument();
    expect(screen.getByText(/직접 수업 가능/)).toBeInTheDocument();
  });

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

  it("linkedTeacherId 가 null 이면 null 반환 (owner 본인 강사 미등록)", () => {
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
    const { container } = render(<OwnerTeacherCard />);
    expect(container.firstChild).toBeNull();
  });

  it("linkedTeacherId 로 teacher row 못 찾으면 null 반환", () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      linkedTeacherId: "non-existent-teacher",
      canManage: true,
      academies: [],
      isLoading: false,
      linkedTeacherName: null,
      linkedTeacherColor: null,
      adminCount: 1,
    });
    const { container } = render(<OwnerTeacherCard />);
    expect(container.firstChild).toBeNull();
  });

  it("담당 과목 chip 표시 (영어/수학)", () => {
    render(<OwnerTeacherCard />);
    expect(screen.getByTestId(`owner-subject-${ENGLISH_SUBJECT.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`owner-subject-${MATH_SUBJECT.id}`)).toBeInTheDocument();
    expect(screen.getByText("영어")).toBeInTheDocument();
    expect(screen.getByText("수학")).toBeInTheDocument();
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

  it("onChangeSubjects 미제공 시 '과목 변경' 버튼 숨김 (Part 1 default)", () => {
    render(<OwnerTeacherCard />);
    expect(screen.queryByTestId("owner-change-subjects")).toBeNull();
  });

  it("onChangeSubjects 제공 시 버튼 표시 + click 시 handler 호출", () => {
    const handler = vi.fn();
    render(<OwnerTeacherCard onChangeSubjects={handler} />);
    const btn = screen.getByTestId("owner-change-subjects");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("teacher.name 이 없으면 user email 의 prefix 로 fallback", () => {
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
