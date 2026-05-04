import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton, SkeletonRow } from "./Skeleton";

const meta = {
  title: "Atoms/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["rect", "circle"],
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bar: Story = {
  args: {
    variant: "rect",
    className: "h-4 w-32 rounded",
  },
};

export const LongBar: Story = {
  args: {
    variant: "rect",
    className: "h-3 w-64",
  },
};

export const CircularAvatar: Story = {
  args: {
    variant: "circle",
    className: "w-12 h-12",
  },
};

export const SmallCircle: Story = {
  args: {
    variant: "circle",
    className: "w-6 h-6",
  },
};

export const ListRow: Story = {
  render: () => <SkeletonRow />,
  parameters: {
    docs: {
      description: {
        story: "SkeletonRow — 학생 리스트 등 단일 row placeholder (avatar + 2-line text)",
      },
    },
  },
};

export const MultipleRows: Story = {
  render: () => (
    <div className="w-80 border border-[var(--color-border)] rounded-md">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  ),
};
