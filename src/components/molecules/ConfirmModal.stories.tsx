import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

const meta = {
  title: "Molecules/ConfirmModal",
  component: ConfirmModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["danger", "warning", "info"],
    },
  },
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const Interactive = (args: React.ComponentProps<typeof ConfirmModal>) => {
  const [open, setOpen] = useState(args.isOpen);
  return (
    <div className="flex h-screen items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-accent text-white rounded"
      >
        모달 열기
      </button>
      <ConfirmModal
        {...args}
        isOpen={open}
        onConfirm={() => {
          alert("확인 클릭");
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
};

export const Danger: Story = {
  args: {
    isOpen: true,
    title: "삭제 확인",
    message: "이 학생을 정말 삭제하시겠습니까? 되돌릴 수 없습니다.",
    confirmText: "삭제",
    variant: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Warning: Story = {
  args: {
    isOpen: true,
    title: "주의",
    message: "변경 사항이 저장되지 않았습니다. 페이지를 떠나시겠습니까?",
    confirmText: "떠나기",
    variant: "warning",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Info: Story = {
  args: {
    isOpen: true,
    title: "안내",
    message: "이 작업이 완료되면 자동으로 동기화됩니다.",
    confirmText: "확인",
    variant: "info",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const LongMessage: Story = {
  args: {
    isOpen: true,
    title: "데이터 마이그레이션",
    message:
      "이 기기에 저장된 5명의 학생, 3개의 과목, 12개의 수업 데이터를 서버 계정으로 옮깁니다. 작업 중 다른 탭이나 앱을 닫지 마세요. 인터넷 연결이 끊기면 처음부터 다시 시도해야 할 수 있습니다.",
    confirmText: "옮기기",
    cancelText: "나중에",
    variant: "info",
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const InteractiveStory: Story = {
  args: {
    isOpen: false,
    title: "삭제 확인",
    message: "이 항목을 삭제하시겠습니까?",
    onConfirm: () => {},
    onCancel: () => {},
  },
  render: (args) => <Interactive {...args} />,
};
