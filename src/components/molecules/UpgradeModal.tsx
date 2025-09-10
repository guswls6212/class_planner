/**
 * UpgradeModal 컴포넌트
 * 유료 기능 제한 시 업그레이드 유도 모달
 */

import React from 'react';
import type { FeatureType } from '../../types/dataSyncTypes';
import styles from './UpgradeModal.module.css';

interface UpgradeModalProps {
  isOpen: boolean;
  featureType?: FeatureType;
  currentCount?: number;
  limit?: number;
  onClose: () => void;
  onLogin: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  featureType,
  currentCount = 0,
  limit = 10,
  onClose,
  onLogin,
}) => {
  if (!isOpen) return null;

  const getFeatureInfo = () => {
    switch (featureType) {
      case 'addStudent':
        return {
          title: '학생 추가 제한',
          icon: '👥',
          description: '무료 버전에서는 최대 10명의 학생만 관리할 수 있습니다.',
          benefits: [
            '무제한 학생 관리',
            '여러 기기에서 동기화',
            '데이터 백업 및 복원',
            '우선 고객 지원',
          ],
        };
      case 'addSubject':
        return {
          title: '과목 추가 제한',
          icon: '📚',
          description: '무료 버전에서는 최대 20개의 과목만 추가할 수 있습니다.',
          benefits: [
            '무제한 과목 관리',
            '과목별 색상 커스터마이징',
            '과목 통계 및 분석',
            '과목 템플릿 기능',
          ],
        };
      case 'addSession':
        return {
          title: '수업 추가 제한',
          icon: '⏰',
          description: '무료 버전에서는 최대 50개의 수업만 추가할 수 있습니다.',
          benefits: [
            '무제한 수업 관리',
            '수업 템플릿 기능',
            '자동 시간표 생성',
            '수업 통계 및 리포트',
          ],
        };
      case 'exportData':
        return {
          title: '데이터 내보내기',
          icon: '📤',
          description: '데이터 내보내기는 로그인 사용자만 이용할 수 있습니다.',
          benefits: [
            'PDF 시간표 내보내기',
            'Excel 데이터 내보내기',
            '데이터 백업 및 복원',
            '여러 기기 동기화',
          ],
        };
      default:
        return {
          title: '프리미엄 기능',
          icon: '⭐',
          description: '더 많은 기능을 사용하려면 로그인이 필요합니다.',
          benefits: ['무제한 사용', '데이터 동기화', '고급 기능', '우선 지원'],
        };
    }
  };

  const featureInfo = getFeatureInfo();
  const remainingCount = limit - currentCount;

  const handleLogin = () => {
    onLogin();
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{featureInfo.title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.iconSection}>
            <div className={styles.icon}>{featureInfo.icon}</div>
            <p className={styles.description}>{featureInfo.description}</p>
          </div>

          {featureType !== 'exportData' && (
            <div className={styles.limitInfo}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(currentCount / limit) * 100}%` }}
                />
              </div>
              <div className={styles.limitText}>
                <span className={styles.currentCount}>{currentCount}</span>
                <span className={styles.separator}>/</span>
                <span className={styles.limitCount}>{limit}</span>
                <span className={styles.remaining}>
                  ({remainingCount}개 남음)
                </span>
              </div>
            </div>
          )}

          <div className={styles.benefitsSection}>
            <h3>프리미엄 혜택</h3>
            <ul className={styles.benefitsList}>
              {featureInfo.benefits.map((benefit, index) => (
                <li key={index} className={styles.benefitItem}>
                  <span className={styles.checkmark}>✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.actionSection}>
            <button className={styles.loginButton} onClick={handleLogin}>
              <span className={styles.buttonIcon}>🔐</span>
              로그인하고 프리미엄 시작하기
            </button>
            <p className={styles.loginNote}>
              로그인하면 모든 제한이 해제되고 데이터가 안전하게 동기화됩니다.
            </p>
          </div>

          <div className={styles.featuresPreview}>
            <h4>프리미엄 기능 미리보기</h4>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔄</div>
                <div className={styles.featureTitle}>실시간 동기화</div>
                <div className={styles.featureDesc}>
                  여러 기기에서 실시간으로 데이터 동기화
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>☁️</div>
                <div className={styles.featureTitle}>클라우드 백업</div>
                <div className={styles.featureDesc}>
                  데이터를 안전하게 클라우드에 백업
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📊</div>
                <div className={styles.featureTitle}>통계 및 분석</div>
                <div className={styles.featureDesc}>
                  상세한 시간표 통계와 분석 리포트
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🎨</div>
                <div className={styles.featureTitle}>커스터마이징</div>
                <div className={styles.featureDesc}>
                  다양한 테마와 색상 커스터마이징
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UpgradeModal);
