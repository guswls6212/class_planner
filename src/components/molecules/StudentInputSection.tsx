import React, { useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';

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

  const errorMessage = externalErrorMessage || internalErrorMessage;

  const handleAddStudent = () => {
    const name = newStudentName.trim();
    if (!name) {
      setInternalErrorMessage('학생 이름을 입력해주세요.');
      return;
    }

    if (name.length > 4) {
      setInternalErrorMessage('학생 이름은 최대 4글자까지 가능합니다.');
      return;
    }

    const isDuplicate = students.some(student => student.name === name);
    if (isDuplicate) {
      setInternalErrorMessage('이미 존재하는 학생 이름입니다.');
      return;
    }

    onAddStudent(name);
    setInternalErrorMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const limited = value.slice(0, 4);
    onNewStudentNameChange(limited);
    if (internalErrorMessage) {
      setInternalErrorMessage('');
    }
  };

  return (
    <div className={`relative mb-4 flex flex-wrap items-center gap-2 ${className}`} style={style}>
      <div className="flex-1">
        <label htmlFor="student-name-input" className="sr-only">학생 이름</label>
        <Input
          id="student-name-input"
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
      <div className="shrink-0">
        <Button onClick={handleAddStudent}>추가</Button>
      </div>
      {errorMessage && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-500">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default StudentInputSection;
