import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SyncStatusDot from "./SyncStatusDot";

/**
 * SyncStatusDot은 useSyncStatus hook 직접 구독 — Storybook에서 module state mock 어려움.
 * PR H에서 optional `statusOverride` + `contextLabelOverride` prop 추가하여 Storybook에서
 * 명시 status 주입 가능. Production은 prop 미사용 → hook 그대로.
 */
const meta = {
  title: "Atoms/SyncStatusDot",
  component: SyncStatusDot,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    statusOverride: {
      control: "select",
      options: ["idle", "failed_retrying", "failed_giving_up"],
    },
    contextLabelOverride: {
      control: "text",
    },
  },
} satisfies Meta<typeof SyncStatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    statusOverride: "idle",
  },
  parameters: {
    docs: {
      description: { story: "idle 상태 — 시각 노이즈 0 (null 렌더). 실제 정상 운영 중 모습." },
    },
  },
};

export const Retrying: Story = {
  args: {
    statusOverride: "failed_retrying",
  },
  parameters: {
    docs: {
      description: { story: "재시도 중 — 노란 ⚠️ + RefreshCw spinner. 자동 재시도 중." },
    },
  },
};

export const RetryingWithContext: Story = {
  args: {
    statusOverride: "failed_retrying",
    contextLabelOverride: "수업 추가",
  },
  parameters: {
    docs: {
      description: { story: "재시도 중 + 어떤 데이터가 실패하고 있는지 안내 (예: '수업 추가 재시도 중')." },
    },
  },
};

export const GivingUp: Story = {
  args: {
    statusOverride: "failed_giving_up",
  },
  parameters: {
    docs: {
      description: { story: "포기 — 빨간 ⚠️ + AlertTriangle. 사용자 액션 필요. 클릭하면 SyncQueueModal." },
    },
  },
};

export const GivingUpWithContext: Story = {
  args: {
    statusOverride: "failed_giving_up",
    contextLabelOverride: "강사 초대",
  },
  parameters: {
    docs: {
      description: { story: "포기 + context label — '강사 초대 동기화 실패'." },
    },
  },
};
