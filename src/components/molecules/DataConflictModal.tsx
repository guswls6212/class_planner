"use client";

import React from "react";
import type { ClassPlannerData } from "../../lib/localStorageCrud";
import styles from "./DataConflictModal.module.css";

interface DataConflictModalProps {
  localData: ClassPlannerData;
  serverData: ClassPlannerData;
  onSelectServer: () => void;
  onSelectLocal: () => void;
}

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  localData,
  onSelectServer,
  onSelectLocal,
}) => {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>이전 작업 데이터가 있습니다</h2>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>로그인하기 전에 작업한 데이터:</p>
          <ul className={styles.summary}>
            {localData.students.length > 0 && (
              <li>학생 {localData.students.length}명</li>
            )}
            {localData.subjects.length > 0 && (
              <li>과목 {localData.subjects.length}개</li>
            )}
            {localData.sessions.length > 0 && (
              <li>수업 {localData.sessions.length}개</li>
            )}
          </ul>
          <p className={styles.question}>어떤 데이터를 사용하시겠습니까?</p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.serverButton}
            onClick={onSelectServer}
          >
            서버 데이터 사용
          </button>
          <button
            className={styles.localButton}
            onClick={onSelectLocal}
          >
            로컬 데이터 사용
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataConflictModal;
