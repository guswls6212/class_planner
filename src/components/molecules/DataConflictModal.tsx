"use client";

import React, { useState } from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import type { Student, Subject, Enrollment, Session } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
import { useModalA11y } from "../../hooks/useModalA11y";
import styles from "./DataConflictModal.module.css";

interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;
  onSelectServer: () => void;
  onSelectLocal: () => void;
  isMigrating?: boolean;
  migrationError?: string | null;
}

const DEFAULT_SUBJECT_NAMES = new Set([
  "초등수학",
  "중등수학",
  "중등영어",
  "중등국어",
  "중등과학",
  "중등사회",
  "고등수학",
  "고등영어",
  "고등국어",
]);

function filterNonDefaultSubjects(subjects: Subject[]): Subject[] {
  return subjects.filter((s) => !DEFAULT_SUBJECT_NAMES.has(s.name));
}

/** 그룹 수업을 과목 기준으로 포맷. 예: "월 09:30~10:30 중등수학 · 이현진, 강지원" */
function formatSessionDisplay(
  session: Session,
  enrollments: Enrollment[],
  students: { id: string; name: string }[],
  subjects: Subject[]
): { weekday: string; time: string; subject: string; studentNames: string[]; isGroup: boolean } {
  const weekday = weekdays[session.weekday] ?? "?";
  const time = `${session.startsAt}~${session.endsAt}`;

  const studentNames: string[] = [];
  let subjectName = "";

  for (const eId of session.enrollmentIds ?? []) {
    const enrollment = enrollments.find((e) => e.id === eId);
    if (!enrollment) continue;
    const student = students.find((s) => s.id === enrollment.studentId);
    if (student) studentNames.push(student.name);
    if (!subjectName) {
      const subject = subjects.find((s) => s.id === enrollment.subjectId);
      subjectName = subject?.name ?? "";
    }
  }

  return {
    weekday,
    time,
    subject: subjectName || "?",
    studentNames,
    isGroup: studentNames.length > 1,
  };
}

function formatLastModified(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  localData,
  serverData,
  onSelectServer,
  onSelectLocal,
  isMigrating,
  migrationError,
}) => {
  const [activeTab, setActiveTab] = useState<"local" | "server">("local");
  const [selectedSide, setSelectedSide] = useState<"local" | "server" | null>(null);

  // DataConflictModal must be explicitly resolved — Escape is intentionally a no-op
  // isOpen is always true here because DataConflictModal is only rendered when needed
  // (parent controls conditional render). onClose is a no-op — user must resolve conflict.
  const { containerRef } = useModalA11y({ isOpen: true, onClose: () => {} });

  const localSubjects = filterNonDefaultSubjects(localData.subjects);
  const serverSubjects = filterNonDefaultSubjects(serverData.subjects);

  const handleConfirm = () => {
    if (selectedSide === "local") onSelectLocal();
    else if (selectedSide === "server") onSelectServer();
  };

  return (
    /* No backdrop click handler — modal must be explicitly resolved via the buttons below */
    <div
      className={styles.backdrop}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-conflict-modal-title"
        ref={containerRef}
      >
        {isMigrating && (
          <div className={styles.migrationOverlay} aria-live="polite">
            <div className={styles.migrationSpinner} />
            <span className={styles.migrationText}>데이터를 동기화하는 중...</span>
          </div>
        )}

        <div className={styles.header}>
          <h2 id="data-conflict-modal-title" className={styles.title}>
            데이터 충돌이 감지되었습니다
          </h2>
          <p className={styles.subtitle}>
            어느 데이터로 시작할지 선택해주세요.
          </p>
        </div>

        {/* 데스크탑: 카드 Side-by-Side */}
        <div className={styles.cardsGrid}>
          <DataCard
            testId="card-local"
            sourceLabel="이 기기의 데이터"
            data={localData}
            filteredSubjects={localSubjects}
            selected={selectedSide === "local"}
            onSelect={() => setSelectedSide("local")}
            disabled={isMigrating}
          />
          <DataCard
            testId="card-server"
            sourceLabel="내 계정의 데이터"
            data={serverData}
            filteredSubjects={serverSubjects}
            selected={selectedSide === "server"}
            onSelect={() => setSelectedSide("server")}
            disabled={isMigrating}
          />
        </div>

        {/* 데스크탑: 확인 버튼 */}
        <div className={styles.confirmRow}>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!selectedSide || isMigrating}
          >
            {isMigrating ? "저장 중..." : "선택한 데이터로 시작"}
          </button>
        </div>

        {/* 모바일: 탭 전환 */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "local"}
              className={`${styles.tab} ${activeTab === "local" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("local")}
            >
              이 기기의 데이터
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "server"}
              className={`${styles.tab} ${activeTab === "server" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("server")}
            >
              내 계정의 데이터
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === "local" ? (
              <>
                <StudentSection students={localData.students} />
                <SubjectSection subjects={localData.subjects} filteredSubjects={localSubjects} />
                <SessionSection
                  sessions={localData.sessions}
                  enrollments={localData.enrollments}
                  students={localData.students}
                  subjects={localData.subjects}
                />
                <button
                  className={styles.mobileSelectBtn}
                  data-testid="card-local"
                  onClick={onSelectLocal}
                  disabled={isMigrating}
                >
                  이 기기의 데이터로 시작
                </button>
              </>
            ) : (
              <>
                <StudentSection students={serverData.students} />
                <SubjectSection subjects={serverData.subjects} filteredSubjects={serverSubjects} />
                <SessionSection
                  sessions={serverData.sessions}
                  enrollments={serverData.enrollments}
                  students={serverData.students}
                  subjects={serverData.subjects}
                />
                <button
                  className={styles.mobileSelectBtn}
                  data-testid="card-server"
                  onClick={onSelectServer}
                  disabled={isMigrating}
                >
                  내 계정의 데이터로 시작
                </button>
              </>
            )}
          </div>
        </div>

        {/* 에러 배너 */}
        {!isMigrating && migrationError && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorText}>{migrationError}</span>
            <button className={styles.retryBtn} onClick={onSelectLocal}>
              다시 시도
            </button>
          </div>
        )}

        {/* 안내 배너 */}
        <div className={styles.infoBanner} role="note">
          <span className={styles.infoIcon}>ℹ</span>
          <span>
            선택한 데이터가 내 계정에 저장되며, 양쪽에 같은 데이터가 있으면 내 계정의 데이터가 유지됩니다.
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── 하위 컴포넌트 ────────────────────────────── */

interface DataCardProps {
  testId: string;
  sourceLabel: string;
  data: ClassPlannerData;
  filteredSubjects: Subject[];
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const DataCard: React.FC<DataCardProps> = ({
  testId,
  sourceLabel,
  data,
  filteredSubjects,
  selected,
  onSelect,
  disabled,
}) => {
  const lastModified = formatLastModified(data.lastModified);

  return (
    <div
      className={`${styles.dataCard} ${selected ? styles.dataCardSelected : ""} ${disabled ? styles.dataCardDisabled : ""}`}
      data-testid={testId}
    >
      <label className={styles.cardHeader}>
        <input
          type="radio"
          name="dataSelection"
          checked={selected}
          onChange={onSelect}
          className={styles.radioInput}
          disabled={disabled}
          aria-label={sourceLabel}
        />
        <span className={styles.cardLabel}>{sourceLabel}</span>
        {lastModified && (
          <span className={styles.lastModified}>{lastModified}</span>
        )}
      </label>
      <StudentSection students={data.students} />
      <SubjectSection subjects={data.subjects} filteredSubjects={filteredSubjects} />
      <SessionSection
        sessions={data.sessions}
        enrollments={data.enrollments}
        students={data.students}
        subjects={data.subjects}
      />
    </div>
  );
};

/* ── StudentSection: 학생 섹션 (이름, 성별, 생년월일 표시) ── */

function formatGender(gender: string | undefined): string {
  if (!gender) return "";
  if (gender === "male" || gender === "남") return "남";
  if (gender === "female" || gender === "여") return "여";
  return gender;
}

function formatBirthDate(birthDate: string | undefined): string {
  if (!birthDate) return "";
  try {
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return birthDate;
    return `${d.getFullYear().toString().slice(2)}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  } catch {
    return birthDate;
  }
}

interface StudentSectionProps {
  students: Student[];
}

const StudentSection: React.FC<StudentSectionProps> = ({ students }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.section}>
      {students.length > 0 ? (
        <button
          type="button"
          className={`${styles.sectionLabel} ${styles.sectionLabelClickable}`}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          학생
          <span className={styles.countBadge}>{students.length}명</span>
          <span className={styles.expandIcon}>{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className={styles.sectionLabel}>
          학생
          <span className={styles.countBadge}>{students.length}명</span>
        </div>
      )}
      {expanded && students.length > 0 && (
        <ul className={styles.dataList}>
          {students.map((student, idx) => {
            const gender = formatGender(student.gender);
            const birth = formatBirthDate(student.birthDate);
            const meta = [gender, birth].filter(Boolean).join(" · ");
            return (
              <li key={`${student.id}-${idx}`} className={styles.dataItem}>
                <span className={styles.dataItemName}>{student.name}</span>
                {meta && <span className={styles.dataItemMeta}>{meta}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/* ── SubjectSection: 과목 섹션 (기본 과목 안내 포함) ── */

interface SubjectSectionProps {
  subjects: Subject[];
  filteredSubjects: Subject[];
}

const SubjectSection: React.FC<SubjectSectionProps> = ({ subjects, filteredSubjects }) => {
  const [expanded, setExpanded] = useState(false);
  const defaultCount = subjects.length - filteredSubjects.length;
  const customCount = filteredSubjects.length;

  return (
    <div className={styles.section}>
      {subjects.length > 0 ? (
        <button
          type="button"
          className={`${styles.sectionLabel} ${styles.sectionLabelClickable}`}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          과목
          <span className={styles.countBadge}>{subjects.length}개</span>
          <span className={styles.expandIcon}>{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className={styles.sectionLabel}>
          과목
          <span className={styles.countBadge}>{subjects.length}개</span>
        </div>
      )}
      {expanded && subjects.length > 0 && (
        <div className={styles.subjectDetail}>
          {defaultCount > 0 && (
            <span className={styles.subjectMeta}>
              기본 {defaultCount}개
            </span>
          )}
          {customCount > 0 && (
            <span className={styles.subjectMeta}>
              추가 {customCount}개
            </span>
          )}
          <ul className={styles.nameList}>
            {filteredSubjects.map((s) => (
              <li key={s.id} className={styles.nameItem}>
                {s.color && <span className={styles.subjectDot} style={{ background: s.color }} />}
                {s.name}
              </li>
            ))}
            {defaultCount > 0 && (
              <li className={styles.defaultSubjectHint}>
                + 기본 과목 {defaultCount}개 (초등수학, 중등수학 등)
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/* ── SessionSection: 수업 섹션 (그룹 수업 개선) ── */

interface SessionSectionProps {
  sessions: Session[];
  enrollments: Enrollment[];
  students: { id: string; name: string }[];
  subjects: Subject[];
}

const SessionSection: React.FC<SessionSectionProps> = ({
  sessions,
  enrollments,
  students,
  subjects,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.section}>
      {sessions.length > 0 ? (
        <button
          type="button"
          className={`${styles.sectionLabel} ${styles.sectionLabelClickable}`}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          수업
          <span className={styles.countBadge}>{sessions.length}개</span>
          <span className={styles.expandIcon}>{expanded ? "▼" : "▶"}</span>
        </button>
      ) : (
        <div className={styles.sectionLabel}>
          수업
          <span className={styles.countBadge}>{sessions.length}개</span>
        </div>
      )}
      {expanded && sessions.length > 0 && (
        <ul className={styles.sessionList}>
          {sessions.map((session) => {
            const info = formatSessionDisplay(session, enrollments, students, subjects);
            return (
              <li key={session.id} className={styles.sessionItem}>
                <span className={styles.sessionWeekday}>{info.weekday}</span>
                <span className={styles.sessionTime}>{info.time}</span>
                <span className={styles.sessionSubject}>{info.subject}</span>
                {info.isGroup && (
                  <span className={styles.groupBadge}>그룹</span>
                )}
                <span className={styles.sessionStudents}>
                  {info.studentNames.join(", ") || "?"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DataConflictModal;
