"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar, Copy, Plus, RefreshCw, XCircle } from "lucide-react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";
import type { AccessCodeEntry } from "@/hooks/useAccessCodes";
import { StudentAccessCodeBadge } from "@/components/molecules/StudentAccessCodeBadge";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Select } from "@/components/atoms/Select";
import { IconButton } from "@/components/atoms/IconButton";
import { showToast } from "@/lib/toast";
import {
  GENDER_LABEL,
  GRADE_OPTIONS,
  NAME_MAX_LENGTH,
  SCHOOL_MAX_LENGTH,
  formatKoreanPhone,
  getStudentBirthDateRange,
  isBirthDateInRange,
  isValidKoreanPhone,
} from "@/lib/validation/profileSchemas";

interface StudentDetailPanelProps {
  student: Student;
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  onUpdate: (id: string, updates: Partial<Student>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onBack?: () => void;
  /** When false, edit/delete buttons are hidden (member role). Default: true */
  canManage?: boolean;
  /** Parent access code for this student, if any (admins only) */
  accessCode?: AccessCodeEntry;
  /** True when access-code data is available (cache OR completed fetch).
   *  When false, render a Skeleton instead of "no code" or actual content. */
  accessCodesReady?: boolean;
  /** Academy access URL — used for "자녀 시간표 링크 복사" button */
  academyUrl?: string;
  /** Per-student: create a new code for this student */
  onCreateCode?: (studentId: string, studentName?: string) => void;
  /** Per-student: revoke + reissue (user-confirmed in handler) */
  onRenewCode?: (studentId: string, studentName?: string) => void;
  /** Per-student: revoke (expire) — user-confirmed in handler */
  onRevokeCode?: (studentId: string, studentName?: string) => void;
  /** True when viewer is anonymous (not logged in) — empty-state shows login prompt instead of code-create */
  isAnonymous?: boolean;
}

export function StudentDetailPanel({
  student, subjects, enrollments, sessions, onUpdate, onDelete, onBack,
  canManage = true, accessCode, accessCodesReady = true, academyUrl,
  onCreateCode, onRenewCode, onRevokeCode, isAnonymous = false,
}: StudentDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: student.name,
    grade: student.grade ?? "",
    school: student.school ?? "",
    phone: student.phone ?? "",
    gender: student.gender ?? "",
    birthDate: student.birthDate ?? "",
  });
  const [editErr, setEditErr] = useState("");
  const birthRange = useMemo(() => getStudentBirthDateRange(), []);

  // Re-sync when student changes
  useEffect(() => {
    setEditFields({
      name: student.name,
      grade: student.grade ?? "",
      school: student.school ?? "",
      phone: student.phone ?? "",
      gender: student.gender ?? "",
      birthDate: student.birthDate ?? "",
    });
    setIsEditing(false);
  }, [student.id]);

  const studentEnrollments = enrollments.filter((e) => e.studentId === student.id);
  const studentSubjectIds = new Set(studentEnrollments.map((e) => e.subjectId));
  const studentSessions = sessions.filter((s) =>
    s.enrollmentIds?.some((eid) => studentEnrollments.some((e) => e.id === eid))
  );

  const handleSave = async () => {
    const trimmedName = editFields.name.trim();
    if (!trimmedName) {
      setEditErr("학생 이름을 입력해주세요.");
      return;
    }
    if (trimmedName.length > NAME_MAX_LENGTH) {
      setEditErr(`학생 이름은 최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (editFields.school && editFields.school.length > SCHOOL_MAX_LENGTH) {
      setEditErr(`학교명은 최대 ${SCHOOL_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (editFields.phone && !isValidKoreanPhone(editFields.phone)) {
      setEditErr("유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678, 02-123-4567)");
      return;
    }
    if (editFields.birthDate && !isBirthDateInRange(editFields.birthDate, birthRange)) {
      setEditErr("학생 생년월일은 만 4~25세 범위여야 합니다.");
      return;
    }

    const updates: Partial<Student> = {
      name: trimmedName,
      grade: editFields.grade || undefined,
      school: editFields.school || undefined,
      phone: editFields.phone || undefined,
      gender: editFields.gender || undefined,
      birthDate: editFields.birthDate || undefined,
    };
    const success = await onUpdate(student.id, updates);
    if (success) {
      setEditErr("");
      setIsEditing(false);
    }
  };

  const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  const initial = student.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 lg:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            aria-label="목록으로"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        )}
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-[var(--color-admin-ink)] font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{student.name}</h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {[student.grade, student.school].filter(Boolean).join(" · ") || "프로필 미입력"}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1.5">
            <IconButton aria-label="편집" onClick={() => setIsEditing((v) => !v)}>
              <Pencil size={16} strokeWidth={1.5} />
            </IconButton>
            <IconButton
              aria-label="삭제"
              variant="danger"
              onClick={() => onDelete(student.id)}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </IconButton>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <BookOpen size={14} strokeWidth={1.5} />
            <span>등록 과목</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSubjectIds.size}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-md p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] mb-1">
            <Calendar size={14} strokeWidth={1.5} />
            <span>주간 수업</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSessions.length}회</p>
        </div>
      </div>

      {/* Parent Access Code (admin-visible only) — Skeleton while initial
          load in flight (no cache); real content once data is ready. */}
      {canManage && !accessCodesReady && (
        <section className="bg-[var(--color-bg-secondary)] rounded-md p-4">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-7 w-40" />
        </section>
      )}
      {canManage && accessCodesReady && (
        <section className="bg-[var(--color-bg-secondary)] rounded-md p-4">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">
            학부모 접속 코드
          </h3>

          {accessCode ? (
            <>
              <StudentAccessCodeBadge code={accessCode} variant="large" />
              <div className="mt-3 flex flex-wrap gap-2">
                {academyUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window === "undefined") return;
                      // Single-line URL with code as query param — parent
                      // clicks once and the academy page auto-fills + submits.
                      const link = `${academyUrl}?code=${encodeURIComponent(accessCode.access_code)}`;
                      window.navigator.clipboard
                        ?.writeText(link)
                        .then(() => showToast("success", `${student.name} 자녀 시간표 링크가 복사됐습니다`))
                        .catch(() => showToast("error", "복사에 실패했습니다"));
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] hover:border-accent hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <Copy size={12} strokeWidth={1.5} />
                    링크 복사
                  </button>
                )}
                {onRenewCode && (
                  <button
                    type="button"
                    onClick={() => onRenewCode(student.id, student.name)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] hover:border-accent hover:text-[var(--color-text-primary)] transition-colors"
                    title="기존 코드를 만료시키고 새 코드를 발급합니다"
                  >
                    <RefreshCw size={12} strokeWidth={1.5} />
                    재발급
                  </button>
                )}
                {onRevokeCode && (
                  <button
                    type="button"
                    onClick={() => onRevokeCode(student.id, student.name)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] hover:border-red-500 hover:text-red-400 transition-colors"
                    title="코드를 즉시 만료시킵니다 (학부모 접속 차단)"
                  >
                    <XCircle size={12} strokeWidth={1.5} />
                    만료
                  </button>
                )}
              </div>
            </>
          ) : isAnonymous ? (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                로그인하면 학부모에게 시간표를 공유할 수 있어요.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent text-[var(--color-admin-ink)] font-semibold hover:opacity-90 transition-opacity"
              >
                로그인하고 시작하기
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                이 학생은 아직 접속 코드가 없습니다.
              </p>
              {onCreateCode && (
                <button
                  type="button"
                  onClick={() => onCreateCode(student.id, student.name)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent text-[var(--color-admin-ink)] font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus size={12} strokeWidth={2} />
                  이 학생 코드 생성
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Schedule List */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">수업 일정</h3>
        {studentSessions.length === 0 ? (
          <p className="text-[11px] text-[var(--color-text-muted)]">등록된 수업이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {studentSessions.map((session) => {
              const enrollment = studentEnrollments.find((e) =>
                session.enrollmentIds?.includes(e.id)
              );
              const subject = enrollment
                ? subjects.find((s) => s.id === enrollment.subjectId)
                : undefined;
              return (
                <li key={session.id} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject?.color ?? "#3b82f6" }}
                  />
                  <span>{subject?.name ?? "미분류"}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {WEEKDAY_LABELS[session.weekday]} {session.startsAt}–{session.endsAt}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Profile Section */}
      <section>
        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">프로필</h3>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            {/* 이름 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">이름</label>
              <input
                type="text"
                value={editFields.name}
                onChange={(e) =>
                  setEditFields((f) => ({ ...f, name: e.target.value.slice(0, NAME_MAX_LENGTH) }))
                }
                maxLength={NAME_MAX_LENGTH}
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {/* 학년 — 12개 + 미취학/재수/기타 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">학년</label>
              <Select
                size="sm"
                className="flex-1"
                value={editFields.grade}
                onChange={(e) => setEditFields((f) => ({ ...f, grade: e.target.value }))}
              >
                <option value="">선택 안 함</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </div>
            {/* 학교 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">학교</label>
              <input
                type="text"
                value={editFields.school}
                onChange={(e) =>
                  setEditFields((f) => ({ ...f, school: e.target.value.slice(0, SCHOOL_MAX_LENGTH) }))
                }
                maxLength={SCHOOL_MAX_LENGTH}
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {/* 전화번호 — 한국 형식 자동 하이픈 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">전화번호</label>
              <input
                type="tel"
                value={editFields.phone}
                onChange={(e) =>
                  setEditFields((f) => ({ ...f, phone: formatKoreanPhone(e.target.value) }))
                }
                placeholder="010-0000-0000"
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {/* 성별 — 남/여 select + 권장 라벨 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                성별
                <span className="rounded bg-indigo-500/15 px-1 py-0.5 text-[9px] font-semibold text-indigo-400">
                  권장
                </span>
              </label>
              <Select
                size="sm"
                className="flex-1"
                value={editFields.gender}
                onChange={(e) => setEditFields((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">선택 안 함</option>
                <option value="male">남</option>
                <option value="female">여</option>
              </Select>
            </div>
            {/* 생년월일 — 만 4~25세 범위 + 권장 라벨 */}
            <div className="flex items-center gap-2">
              <label className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                생년월일
                <span className="rounded bg-indigo-500/15 px-1 py-0.5 text-[9px] font-semibold text-indigo-400">
                  권장
                </span>
              </label>
              <input
                type="date"
                value={editFields.birthDate}
                onChange={(e) => setEditFields((f) => ({ ...f, birthDate: e.target.value }))}
                min={birthRange.min}
                max={birthRange.max}
                className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {editErr && (
              <div
                className="rounded-md border border-red-500/40 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400"
                role="alert"
              >
                {editErr}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-md font-medium text-[13px] hover:opacity-90 transition-opacity"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditErr("");
                  setIsEditing(false);
                }}
                className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-md text-[13px] hover:opacity-80 transition-opacity"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          // read-only: 프로필 5개 필드(이름은 헤더에 이미 표시되므로 중복 제외)를
          // 라벨과 값으로 표시. 빈 값은 "—"로 placeholder — 사용자가 어느 필드가
          // 비어있는지 한눈에 인지하고 편집 버튼으로 보강 유도.
          <dl className="flex flex-col gap-1.5 text-sm">
            {(
              [
                { key: "grade", label: "학년" },
                { key: "school", label: "학교" },
                { key: "phone", label: "전화번호" },
                { key: "gender", label: "성별" },
                { key: "birthDate", label: "생년월일" },
              ] as { key: keyof Student; label: string }[]
            ).map(({ key, label }) => {
              const value = student[key];
              const hasValue = value !== undefined && value !== null && value !== "";
              const displayValue = !hasValue
                ? "—"
                : key === "gender" && (value === "male" || value === "female")
                  ? GENDER_LABEL[value]
                  : String(value);
              return (
                <div key={String(key)} className="flex items-baseline gap-2">
                  <dt className="w-20 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">{label}</dt>
                  <dd
                    className={
                      hasValue
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)] italic"
                    }
                  >
                    {displayValue}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>
    </div>
  );
}
