import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TeacherStatusPill } from "./TeacherStatusPill";

const meta = {
  title: "Atoms/TeacherStatusPill",
  component: TeacherStatusPill,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["owner", "active", "invite_pending", "invite_expired", "share_only", "none"],
    },
  },
} satisfies Meta<typeof TeacherStatusPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Owner: Story = {
  args: {
    status: "owner",
  },
};

export const Active: Story = {
  args: {
    status: "active",
  },
};

export const InvitePendingNoExpiry: Story = {
  args: {
    status: "invite_pending",
  },
};

export const InvitePendingD3: Story = {
  args: {
    status: "invite_pending",
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  parameters: {
    docs: {
      description: { story: "초대 만료까지 3일 남음 — D-3 라벨 렌더" },
    },
  },
};

export const InviteExpired: Story = {
  args: {
    status: "invite_expired",
  },
};

export const ShareOnly: Story = {
  args: {
    status: "share_only",
  },
};

export const None: Story = {
  args: {
    status: "none",
  },
};

export const AllStates: Story = {
  args: {
    status: "owner",
  },
  render: () => (
    <div className="flex flex-col gap-2 items-start">
      <TeacherStatusPill status="owner" />
      <TeacherStatusPill status="active" />
      <TeacherStatusPill status="invite_pending" />
      <TeacherStatusPill
        status="invite_pending"
        expiresAt={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()}
      />
      <TeacherStatusPill status="invite_expired" />
      <TeacherStatusPill status="share_only" />
      <TeacherStatusPill status="none" />
    </div>
  ),
};
