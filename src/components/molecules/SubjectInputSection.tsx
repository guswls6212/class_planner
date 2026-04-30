import React, { useState } from "react";
import { logger } from "../../lib/logger";
import Button from "../atoms/Button";
import Input from "../atoms/Input";

interface SubjectInputSectionProps {
  onAddSubject: (name: string, color: string) => Promise<boolean>;
  onSearchChange?: (query: string) => void;
  errorMessage?: string;
  subjects?: Array<{ name: string }>;
  className?: string;
  style?: React.CSSProperties;
}

const SubjectInputSection: React.FC<SubjectInputSectionProps> = ({
  onAddSubject,
  onSearchChange,
  errorMessage: externalErrorMessage,
  subjects = [],
  className = "",
  style = {},
}) => {
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#f59e0b");
  const [internalErrorMessage, setInternalErrorMessage] = useState<string>("");

  const errorMessage = externalErrorMessage || internalErrorMessage;

  const handleAddSubject = async () => {
    const name = subjectName.trim();

    if (!name) {
      setInternalErrorMessage("과목 이름을 입력해주세요.");
      return;
    }

    if (name.length > 6) {
      setInternalErrorMessage("과목 이름은 최대 6글자까지 가능합니다.");
      return;
    }

    const isDuplicate = subjects.some(
      (subject) => subject.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      setInternalErrorMessage("이미 존재하는 과목 이름입니다.");
      return;
    }

    const success = await onAddSubject(name, subjectColor);

    if (success) {
      logger.info("✅ 과목 추가 성공 - 입력창 초기화");
      setSubjectName("");
      setSubjectColor("#f59e0b");
      setInternalErrorMessage("");

      if (onSearchChange) {
        onSearchChange("");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const limited = value.slice(0, 6);
    setSubjectName(limited);

    if (onSearchChange) {
      onSearchChange(value);
    }

    if (internalErrorMessage) {
      setInternalErrorMessage("");
    }
  };

  return (
    <div className={`relative mb-4 flex flex-wrap items-center gap-2 ${className}`} style={style}>
      <div className="flex-1">
        <label htmlFor="subject-name-input" className="sr-only">과목 이름</label>
        <Input
          id="subject-name-input"
          placeholder="과목 이름 (검색 가능)"
          value={subjectName}
          onChange={handleInputChange}
          maxLength={6}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddSubject();
          }}
        />
      </div>
      <div className="shrink-0">
        <label htmlFor="subject-color-input" className="sr-only">과목 색상</label>
        <input
          id="subject-color-input"
          type="color"
          className="h-9 w-10 cursor-pointer rounded border border-[--color-border] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
          value={subjectColor}
          onChange={(e) => setSubjectColor(e.target.value)}
          title="과목 색상 선택"
        />
      </div>
      <div className="shrink-0">
        <Button onClick={handleAddSubject}>추가</Button>
      </div>
      {errorMessage && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-500">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default SubjectInputSection;
