"use client";

import React, { useState } from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import type { Subject, Enrollment, Session } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
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

function formatSessionDisplay(
  session: Session,
  enrollments: Enrollment[],
  students: { id: string; name: string }[],
  subjects: Subject[]
): string {
  const weekday = weekdays[session.weekday] ?? "?";
  const time = `${session.startsAt}~${session.endsAt}`;
  const details = (session.enrollmentIds ?? [])
    .map((eId) => {
      const enrollment = enrollments.find((e) => e.id === eId);
      if (!enrollment) return null;
      const student = students.find((s) => s.id === enrollment.studentId);
      const subject = subjects.find((s) => s.id === enrollment.subjectId);
      return `${student?.name ?? "?"}/${subject?.name ?? "?"}`;
    })
    .filter((x): x is string => x !== null)
    .join(", ");
  return details ? `${weekday} ${time} ${details}` : `${weekday} ${time}`;
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

  const localSubjects = filterNonDefaultSubjects(localData.subjects);
  const serverSubjects = filterNonDefaultSubjects(serverData.subjects);

  const handleConfirm = () => {
    if (selectedSide === "local") onSelectLocal();
    else if (selectedSide === "server") onSelectServer();
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        // 백드롭 클릭으로 모달이 닫히지 않음 — 의도적으로 처리하지 않음
        if (e.target === e.currentTarget) return;
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        {/* 마이그레이션 로딩 오버레이 */}
        {isMigrating && (
          <div className={styles.migrationOverlay} aria-live="polite">
            <div className={styles.migrationSpinner} />
            <span className={styles.migrationText}>데이터를 동기화하는 중...</span>
          </div>
        )}

        <div className={styles.header}>
          <h2 id="conflict-modal-title" className={styles.title}>
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
                <NameSection label="학생" names={localData.students.map((s) => s.name)} />
                <NameSection label="과목" names={localSubjects.map((s) => s.name)} unit="개" />
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
                <NameSection label="학생" names={serverData.students.map((s) => s.name)} />
                <NameSection label="과목" names={serverSubjects.map((s) => s.name)} unit="개" />
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
      </label>
      <NameSection label="학생" names={data.students.map((s) => s.name)} />
      <NameSection label="과목" names={filteredSubjects.map((s) => s.name)} unit="개" />
      <SessionSection
        sessions={data.sessions}
        enrollments={data.enrollments}
        students={data.students}
        subjects={data.subjects}
      />
    </div>
  );
};

interface NameSectionProps {
  label: string;
  names: string[];
  unit?: string;
}

const NameSection: React.FC<NameSectionProps> = ({ label, names, unit = "명" }) => (
  <div className={styles.section}>
    <div className={styles.sectionLabel}>
      {label}
      <span className={styles.countBadge}>{names.length}{unit}</span>
    </div>
    {names.length > 0 && (
      <ul className={styles.nameList}>
        {names.map((name, idx) => (
          <li key={`${name}-${idx}`} className={styles.nameItem}>
            {name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

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
      <div
        className={`${styles.sectionLabel} ${sessions.length > 0 ? styles.sectionLabelClickable : ""}`}
        onClick={() => { setExpanded(!expanded); }}
        role={sessions.length > 0 ? "button" : undefined}
        aria-expanded={sessions.length > 0 ? expanded : undefined}
      >
        수업
        <span className={styles.countBadge}>{sessions.length}개</span>
        {sessions.length > 0 && (
          <span className={styles.expandIcon}>{expanded ? "▼" : "▶"}</span>
        )}
      </div>
      {expanded && sessions.length > 0 && (
        <ul className={styles.sessionList}>
          {sessions.map((session) => (
            <li key={session.id} className={styles.sessionItem}>
              {formatSessionDisplay(session, enrollments, students, subjects)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DataConflictModal;
