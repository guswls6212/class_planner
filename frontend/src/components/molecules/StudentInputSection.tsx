import React, { useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import styles from './StudentInputSection.module.css';

interface StudentInputSectionProps {
  newStudentName: string;
  onNewStudentNameChange: (name: string) => void;
  onAddStudent: (name: string) => void;
  errorMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentInputSection: React.FC<StudentInputSectionProps> = ({
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  errorMessage: externalErrorMessage,
  className = '',
  style = {},
}) => {
  const [internalErrorMessage, setInternalErrorMessage] = useState<string>('');

  // 외부 에러 메시지가 있으면 그것을 우선 사용, 없으면 내부 에러 메시지 사용
  const errorMessage = externalErrorMessage || internalErrorMessage;

  const handleAddStudent = () => {
    const name = newStudentName.trim();
    if (!name) {
      setInternalErrorMessage('학생 이름을 입력해주세요.');
      return;
    }

    // 중복 이름 체크는 부모 컴포넌트에서 처리
    onAddStudent(name);

    // 성공 시 에러 메시지 초기화
    setInternalErrorMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNewStudentNameChange(e.target.value);
    // 입력 중일 때는 내부 에러 메시지 숨김
    if (internalErrorMessage) {
      setInternalErrorMessage('');
    }
  };

  return (
    <div className={`${styles.container} ${className}`} style={style}>
      <div className={styles.input}>
        <Input
          placeholder="학생 이름"
          value={newStudentName}
          onChange={handleInputChange}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddStudent();
            }
          }}
        />
      </div>
      <div className={styles.button}>
        <Button onClick={handleAddStudent}>추가</Button>
      </div>
      {errorMessage && (
        <div
          className={styles.error}
          style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default StudentInputSection;
