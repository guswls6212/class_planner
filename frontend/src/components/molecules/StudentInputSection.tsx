import React from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';

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
    <div
      className={`student-input-section ${className}`}
      style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        ...style,
      }}
    >
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
      <Button onClick={onAddStudent}>추가</Button>
    </div>
  );
};

export default StudentInputSection;
