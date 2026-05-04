import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { TeacherAddModal } from "./TeacherAddModal";

const meta = {
  title: "Molecules/TeacherAddModal",
  component: TeacherAddModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TeacherAddModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-accent text-white rounded"
      >
        강사 추가 모달 열기
      </button>
      <TeacherAddModal
        open={open}
        userId="story-user"
        onClose={() => setOpen(false)}
        onSuccess={() => {
          alert("성공 콜백");
          setOpen(false);
        }}
      />
    </div>
  );
};

/** 이름만 입력 — 이메일 없을 때 분기: "추가 + 공유 링크 발급" + "일단 추가만" 2버튼 */
export const NoEmail: Story = {
  args: {
    open: true,
    userId: "story-user",
    onClose: () => {},
    onSuccess: () => {},
  },
};

/**
 * 이메일 + 이름 입력 후 시각 — 3버튼 분기를 보려면 사용자 입력 필요.
 * 이 스토리는 모달 열린 상태만 보여주고, 실제 인터랙션은 InteractiveStory에서.
 */
export const InteractiveStory: Story = {
  args: {
    open: false,
    userId: "story-user",
    onClose: () => {},
    onSuccess: () => {},
  },
  render: () => <Interactive />,
};

export const Closed: Story = {
  args: {
    open: false,
    userId: "story-user",
    onClose: () => {},
    onSuccess: () => {},
  },
  parameters: {
    docs: {
      description: { story: "open=false — 모달 미렌더 (null 반환)" },
    },
  },
};
