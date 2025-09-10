import React, { useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import styles from './SubjectInputSection.module.css';

interface SubjectInputSectionProps {
  onAddSubject: (name: string, color: string) => Promise<boolean>;
  onSearchChange?: (query: string) => void;
  errorMessage?: string;
  subjects?: Array<{ name: string }>; // 중복 체크를 위한 과목 목록
  className?: string;
  style?: React.CSSProperties;
}

const SubjectInputSection: React.FC<SubjectInputSectionProps> = ({
  onAddSubject,
  onSearchChange,
  errorMessage: externalErrorMessage,
  subjects = [],
  className = '',
  style = {},
}) => {
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#f59e0b'); // Default orange instead of blue
  const [internalErrorMessage, setInternalErrorMessage] = useState<string>('');

  // 외부 에러 메시지가 있으면 그것을 우선 사용, 없으면 내부 에러 메시지 사용
  const errorMessage = externalErrorMessage || internalErrorMessage;

  const handleAddSubject = async () => {
    const name = subjectName.trim();

    if (!name) {
      setInternalErrorMessage('과목 이름을 입력해주세요.');
      return;
    }

    // 중복 이름 체크
    const isDuplicate = subjects.some(
      subject => subject.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      setInternalErrorMessage('이미 존재하는 과목 이름입니다.');
      return;
    }

    const success = await onAddSubject(name, subjectColor);

    if (success) {
      console.log('✅ 과목 추가 성공 - 입력창 초기화');
      setSubjectName('');
      setSubjectColor('#f59e0b'); // Reset color to default after adding
      setInternalErrorMessage('');
      
      // 검색어도 초기화하여 새로 추가된 과목이 보이도록 함
      if (onSearchChange) {
        onSearchChange('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSubjectName(value);

    // 검색 기능이 활성화된 경우 검색어도 업데이트
    if (onSearchChange) {
      onSearchChange(value);
    }

    // 입력 중일 때는 내부 에러 메시지 숨김
    if (internalErrorMessage) {
      setInternalErrorMessage('');
    }
  };

  return (
    <div className={`${styles.container} ${className}`} style={style}>
      <div className={styles.input}>
        <Input
          placeholder="과목 이름 (검색 가능)"
          value={subjectName}
          onChange={handleInputChange}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSubject();
            }
          }}
        />
      </div>
      <div className={styles.colorPicker}>
        <input
          type="color"
          className={styles.colorInput}
          value={subjectColor}
          onChange={e => setSubjectColor(e.target.value)}
          title="과목 색상 선택"
        />
      </div>
      <div className={styles.button}>
        <Button onClick={handleAddSubject}>추가</Button>
      </div>
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
    </div>
  );
};

export default SubjectInputSection;
