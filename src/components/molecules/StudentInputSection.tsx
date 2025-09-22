import React, { useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import styles from './StudentInputSection.module.css';

interface StudentInputSectionProps {
  newStudentName: string;
  onNewStudentNameChange: (name: string) => void;
  onAddStudent: (name: string) => void;
  errorMessage?: string;
  students?: Array<{ name: string }>;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentInputSection: React.FC<StudentInputSectionProps> = ({
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  errorMessage: externalErrorMessage,
  students = [],
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

    // 길이 제한: 최대 4글자
    if (name.length > 4) {
      setInternalErrorMessage('학생 이름은 최대 4글자까지 가능합니다.');
      return;
    }

    // 중복 이름 체크
    const isDuplicate = students.some(student => student.name === name);
    if (isDuplicate) {
      setInternalErrorMessage('이미 존재하는 학생 이름입니다.');
      return;
    }

    // onAddStudent 호출
    onAddStudent(name);
    setInternalErrorMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const limited = value.slice(0, 4);
    onNewStudentNameChange(limited);
    // 입력 중일 때는 내부 에러 메시지 숨김
    if (internalErrorMessage) {
      setInternalErrorMessage('');
    }
  };

  return (
    <div className={`${styles.container} ${className}`} style={style}>
      <div className={styles.input}>
        <Input
          placeholder="학생 이름 (검색 가능)"
          value={newStudentName}
          onChange={handleInputChange}
          maxLength={4}
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
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
    </div>
  );
};

export default StudentInputSection;
