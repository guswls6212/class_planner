import React, { useState } from "react";
import Button from "../atoms/Button";
import Input from "../atoms/Input";

const DEFAULT_TEACHER_COLORS = [
  "#6366f1",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#0d9488",
];

interface TeacherInputSectionProps {
  onAddTeacher: (name: string, color: string) => Promise<boolean>;
  errorMessage?: string;
  teachers?: Array<{ name: string }>;
  className?: string;
  style?: React.CSSProperties;
}

const TeacherInputSection: React.FC<TeacherInputSectionProps> = ({
  onAddTeacher,
  errorMessage: externalErrorMessage,
  teachers = [],
  className = "",
  style = {},
}) => {
  const [teacherName, setTeacherName] = useState("");
  const [teacherColor, setTeacherColor] = useState(() => {
    // 팔레트에서 순환하여 초기 색상 결정
    return DEFAULT_TEACHER_COLORS[0];
  });
  const [internalErrorMessage, setInternalErrorMessage] = useState<string>("");

  const errorMessage = externalErrorMessage || internalErrorMessage;

  const handleAddTeacher = async () => {
    const name = teacherName.trim();

    if (!name) {
      setInternalErrorMessage("강사 이름을 입력해주세요.");
      return;
    }

    const isDuplicate = teachers.some(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );

    if (isDuplicate) {
      setInternalErrorMessage("이미 존재하는 강사 이름입니다.");
      return;
    }

    const success = await onAddTeacher(name, teacherColor);

    if (success) {
      setTeacherName("");
      // 다음 팔레트 색상으로 순환
      setTeacherColor((prev) => {
        const idx = DEFAULT_TEACHER_COLORS.indexOf(prev);
        return DEFAULT_TEACHER_COLORS[(idx + 1) % DEFAULT_TEACHER_COLORS.length];
      });
      setInternalErrorMessage("");
    }
  };

  return (
    <div
      className={`relative mb-4 flex flex-wrap items-center gap-2 ${className}`}
      style={style}
    >
      <div className="flex-1">
        <label htmlFor="teacher-name-input" className="sr-only">
          강사 이름
        </label>
        <Input
          id="teacher-name-input"
          placeholder="강사 이름"
          value={teacherName}
          onChange={(e) => {
            setTeacherName(e.target.value);
            if (internalErrorMessage) setInternalErrorMessage("");
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTeacher();
            }
          }}
        />
      </div>
      <div className="shrink-0">
        <label htmlFor="teacher-color-input" className="sr-only">
          강사 색상
        </label>
        <input
          id="teacher-color-input"
          type="color"
          className="h-9 w-10 cursor-pointer rounded border border-[--color-border] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
          value={teacherColor}
          onChange={(e) => setTeacherColor(e.target.value)}
          title="강사 색상 선택"
        />
      </div>
      <div className="shrink-0">
        <Button onClick={handleAddTeacher}>추가</Button>
      </div>
      {errorMessage && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-500">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default TeacherInputSection;
