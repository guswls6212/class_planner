import React from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import styles from './StudentInputSection.module.css';

interface StudentInputSectionProps {
  newStudentName: string;
  onNewStudentNameChange: (name: string) => void;
  onAddStudent: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentInputSection: React.FC<StudentInputSectionProps> = ({
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  className = '',
  style = {},
}) => {
  return (
    <div className={`${styles.container} ${className}`} style={style}>
      <div className={styles.input}>
        <Input
          placeholder="학생 이름"
          value={newStudentName}
          onChange={e => onNewStudentNameChange(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddStudent();
            }
          }}
        />
      </div>
      <div className={styles.button}>
        <Button onClick={onAddStudent}>추가</Button>
      </div>
    </div>
  );
};

export default StudentInputSection;
