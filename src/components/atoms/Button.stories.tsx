import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";

const meta = {
  title: "Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "transparent", "tonal", "ghost", "accent"],
    },
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    feedback: {
      control: "select",
      options: ["none", "inline", "toast", "both"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "medium",
    children: "기본 버튼",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    size: "medium",
    children: "보조 버튼",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    size: "medium",
    children: "삭제",
  },
};

export const Transparent: Story = {
  args: {
    variant: "transparent",
    size: "medium",
    children: "투명",
  },
};

export const Tonal: Story = {
  args: {
    variant: "tonal",
    size: "medium",
    children: "Tonal",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    size: "medium",
    children: "Ghost",
  },
};

export const Accent: Story = {
  args: {
    variant: "accent",
    size: "medium",
    children: "Accent",
  },
};

export const Small: Story = {
  args: {
    variant: "primary",
    size: "small",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    variant: "primary",
    size: "large",
    children: "Large",
  },
};

export const Loading: Story = {
  args: {
    variant: "primary",
    size: "medium",
    loading: true,
    children: "처리 중...",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    size: "medium",
    disabled: true,
    children: "비활성",
  },
};

export const InlineFeedback: Story = {
  args: {
    variant: "primary",
    size: "medium",
    feedback: "inline",
    successLabel: "복사됨",
    children: "복사",
  },
  parameters: {
    docs: {
      description: {
        story: "feedback='inline' — 클릭 시 1.5초간 'success' 라벨로 swap",
      },
    },
  },
};

export const ToastFeedback: Story = {
  args: {
    variant: "primary",
    size: "medium",
    feedback: "toast",
    toastMessage: "저장되었습니다",
    children: "저장",
  },
};
