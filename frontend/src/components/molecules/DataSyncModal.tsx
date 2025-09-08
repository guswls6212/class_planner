/**
 * DataSyncModal 컴포넌트
 * 로그인 시 데이터 동기화 시나리오별 선택 UI
 */

import React from 'react';
import type {
  SyncAction,
  SyncModalState,
  SyncResult,
} from '../../types/dataSyncTypes';
import styles from './DataSyncModal.module.css';

interface DataSyncModalProps {
  modalState: SyncModalState;
  isSyncing: boolean;
  onClose: () => void;
  onExecuteSync: (action: SyncAction) => Promise<SyncResult>;
}

const DataSyncModal: React.FC<DataSyncModalProps> = ({
  modalState,
  isSyncing,
  onClose,
  onExecuteSync,
}) => {
  const { isOpen, scenario, localData, serverData } = modalState;

  // 디버깅용 로그 (프로덕션에서는 제거)
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('DataSyncModal 렌더링:', { isOpen, scenario, modalState });
  // }

  if (!isOpen) {
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('DataSyncModal: 모달이 닫혀있음');
    // }
    return null;
  }

  // if (process.env.NODE_ENV === 'development') {
  //   console.log('DataSyncModal: 모달 표시 중');
  //   console.log('DataSyncModal: 모달 상태 상세:', {
  //     isOpen,
  //     scenario,
  //     hasLocalData: !!localData,
  //     hasServerData: !!serverData,
  //     modalState,
  //   });
  // }

  const handleAction = async (action: SyncAction) => {
    await onExecuteSync(action);
  };

  const renderScenarioContent = () => {
    switch (scenario) {
      case 'localOnlyFirstLogin':
        return (
          <div className={styles.scenarioContent}>
            <div className={styles.icon}>📤</div>
            <h3>로컬 데이터를 계정에 저장하시겠습니까?</h3>
            <p className={styles.description}>
              현재 기기에 저장된 시간표 데이터를 계정에 업로드하면, 다른
              기기에서도 동일한 데이터를 사용할 수 있습니다.
            </p>
            {localData && (
              <div className={styles.dataInfo}>
                <div className={styles.dataSummary}>
                  <span className={styles.label}>로컬 데이터:</span>
                  <span className={styles.value}>
                    학생 {localData.students}명, 과목 {localData.subjects}개,
                    수업 {localData.sessions}개
                  </span>
                </div>
                <div className={styles.lastModified}>
                  마지막 수정:{' '}
                  {new Date(localData.lastModified).toLocaleString('ko-KR')}
                </div>
              </div>
            )}
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => handleAction('importData')}
                disabled={isSyncing}
              >
                {isSyncing ? '업로드 중...' : 'Import data'}
              </button>
              <button
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={() => handleAction('startFresh')}
                disabled={isSyncing}
              >
                {isSyncing ? '처리 중...' : 'Start fresh'}
              </button>
            </div>
            <div className={styles.warning}>
              ⚠️ "Start fresh"를 선택하면 로컬 데이터가 영구적으로 삭제됩니다.
            </div>
          </div>
        );

      case 'normalLogin':
        return (
          <div className={styles.scenarioContent}>
            <div className={styles.icon}>📥</div>
            <h3>계정 데이터를 불러오겠습니다</h3>
            <p className={styles.description}>
              계정에 저장된 시간표 데이터를 현재 기기로 다운로드합니다.
            </p>
            {serverData && (
              <div className={styles.dataInfo}>
                <div className={styles.dataSummary}>
                  <span className={styles.label}>서버 데이터:</span>
                  <span className={styles.value}>
                    학생 {serverData.students}명, 과목 {serverData.subjects}개,
                    수업 {serverData.sessions}개
                  </span>
                </div>
                <div className={styles.lastModified}>
                  마지막 수정:{' '}
                  {new Date(serverData.lastModified).toLocaleString('ko-KR')}
                </div>
              </div>
            )}
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => handleAction('downloadServer')}
                disabled={isSyncing}
              >
                {isSyncing ? '다운로드 중...' : '데이터 불러오기'}
              </button>
              <button
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={() => handleAction('cancelSync')}
                disabled={isSyncing}
              >
                취소
              </button>
            </div>
          </div>
        );

      case 'localAndServerConflict':
        return (
          <div className={styles.scenarioContent}>
            <div className={styles.icon}>⚠️</div>
            <h3>데이터 충돌이 발생했습니다</h3>
            <p className={styles.description}>
              현재 기기와 계정에 서로 다른 데이터가 있습니다. 어떤 데이터를
              사용할지 선택해주세요.
            </p>
            <div className={styles.dataComparison}>
              {localData && (
                <div className={styles.dataCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Device data</span>
                    <span className={styles.cardBadge}>현재 기기</span>
                  </div>
                  <div className={styles.dataSummary}>
                    학생 {localData.students}명, 과목 {localData.subjects}개,
                    수업 {localData.sessions}개
                  </div>
                  <div className={styles.lastModified}>
                    마지막 수정:{' '}
                    {new Date(localData.lastModified).toLocaleString('ko-KR')}
                  </div>
                </div>
              )}
              {serverData && (
                <div className={styles.dataCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Server data</span>
                    <span className={styles.cardBadge}>계정</span>
                  </div>
                  <div className={styles.dataSummary}>
                    학생 {serverData.students}명, 과목 {serverData.subjects}개,
                    수업 {serverData.sessions}개
                  </div>
                  <div className={styles.lastModified}>
                    마지막 수정:{' '}
                    {new Date(serverData.lastModified).toLocaleString('ko-KR')}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => handleAction('useServerData')}
                disabled={isSyncing}
              >
                {isSyncing ? '동기화 중...' : 'Server data'}
              </button>
              <button
                className={`${styles.button} ${styles.warningButton}`}
                onClick={() => handleAction('useDeviceData')}
                disabled={isSyncing}
              >
                {isSyncing ? '동기화 중...' : 'Device data'}
              </button>
            </div>
            <div className={styles.warning}>
              ⚠️ 선택하지 않은 데이터는 영구적으로 삭제됩니다.
            </div>
          </div>
        );

      case 'noData':
        return (
          <div className={styles.scenarioContent}>
            <div className={styles.icon}>✨</div>
            <h3>새로운 시작</h3>
            <p className={styles.description}>
              아직 저장된 데이터가 없습니다. 새로운 시간표를 만들어보세요!
            </p>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={onClose}
              >
                시작하기
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>데이터 동기화</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSyncing}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>{renderScenarioContent()}</div>
      </div>
    </div>
  );
};

export default React.memo(DataSyncModal);
