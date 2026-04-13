"use client";

import React, { useState } from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import type { Subject } from "../../lib/planner";
import styles from "./DataConflictModal.module.css";

interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;
  onSelectServer: () => void;
  onSelectLocal: () => void;
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

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  localData,
  serverData,
  onSelectServer,
  onSelectLocal,
}) => {
  const [activeTab, setActiveTab] = useState<"local" | "server">("local");

  const localSubjects = filterNonDefaultSubjects(localData.subjects);
  const serverSubjects = filterNonDefaultSubjects(serverData.subjects);

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
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
              sourceLabel="로컬 데이터"
              students={localData.students.map((s) => s.name)}
              subjects={localSubjects.map((s) => s.name)}
              sessionCount={localData.sessions.length}
              onClick={onSelectLocal}
            />
            <DataCard
              testId="card-server"
              sourceLabel="서버 데이터"
              students={serverData.students.map((s) => s.name)}
              subjects={serverSubjects.map((s) => s.name)}
              sessionCount={serverData.sessions.length}
              onClick={onSelectServer}
            />
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
                로컬 데이터
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "server"}
                className={`${styles.tab} ${activeTab === "server" ? styles.tabActive : ""}`}
                onClick={() => setActiveTab("server")}
              >
                서버 데이터
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === "local" ? (
                <>
                  <NameSection label="학생" names={localData.students.map((s) => s.name)} />
                  <NameSection label="과목" names={localSubjects.map((s) => s.name)} />
                  <SessionCount count={localData.sessions.length} />
                  <button
                    className={styles.mobileSelectBtn}
                    data-testid="card-local"
                    onClick={onSelectLocal}
                  >
                    로컬 데이터로 시작
                  </button>
                </>
              ) : (
                <>
                  <NameSection label="학생" names={serverData.students.map((s) => s.name)} />
                  <NameSection label="과목" names={serverSubjects.map((s) => s.name)} />
                  <SessionCount count={serverData.sessions.length} />
                  <button
                    className={styles.mobileSelectBtn}
                    data-testid="card-server"
                    onClick={onSelectServer}
                  >
                    서버 데이터로 시작
                  </button>
                </>
              )}
            </div>
          </div>

        {/* 세션 미동기 경고 */}
        <div className={styles.warningBanner} role="alert">
          <span className={styles.warningIcon}>⚠</span>
          <span>
            로컬 데이터 선택 시 학생·과목은 서버에 동기화되지만,{" "}
            <strong>수업 일정은 이번 로그인에서 동기화되지 않습니다.</strong>
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
  students: string[];
  subjects: string[];
  sessionCount: number;
  onClick: () => void;
}

const DataCard: React.FC<DataCardProps> = ({
  testId,
  sourceLabel,
  students,
  subjects,
  sessionCount,
  onClick,
}) => {
  const [selected, setSelected] = useState(false);

  const handleClick = () => {
    setSelected(true);
    onClick();
  };

  return (
    <div
      className={`${styles.dataCard} ${selected ? styles.dataCardSelected : ""}`}
      data-testid={testId}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className={styles.cardSource}>
        <span className={styles.cardSourceDot} />
        {sourceLabel}
      </div>
      <NameSection label="학생" names={students} />
      <NameSection label="과목" names={subjects} />
      <SessionCount count={sessionCount} />
      <div className={styles.selectHint}>
        <CheckIcon selected={selected} />
        <span>{selected ? "✓ 선택됨" : "클릭하여 선택"}</span>
      </div>
    </div>
  );
};

interface NameSectionProps {
  label: string;
  names: string[];
}

const NameSection: React.FC<NameSectionProps> = ({ label, names }) => (
  <div className={styles.section}>
    <div className={styles.sectionLabel}>
      {label}
      <span className={styles.countBadge}>{names.length}명</span>
    </div>
    {names.length > 0 && (
      <ul className={styles.nameList}>
        {names.map((name) => (
          <li key={name} className={styles.nameItem}>
            {name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

interface SessionCountProps {
  count: number;
}

const SessionCount: React.FC<SessionCountProps> = ({ count }) => (
  <div className={styles.section}>
    <div className={styles.sectionLabel}>
      수업
      <span className={styles.countBadge}>{count}개</span>
    </div>
  </div>
);

const CheckIcon: React.FC<{ selected: boolean }> = ({ selected }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke={selected ? "#6366f1" : "currentColor"}
    strokeWidth="1.5"
  >
    <circle cx="8" cy="8" r="6.5" />
    {selected && <path d="M5.5 8l2 2 3-3" />}
  </svg>
);

export default DataConflictModal;
