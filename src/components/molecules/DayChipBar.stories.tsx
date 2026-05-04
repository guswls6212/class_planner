import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { DayChipBar } from "./DayChipBar";

const Interactive = ({ initial = 0, baseDate = new Date() }: { initial?: number; baseDate?: Date }) => {
  const [day, setDay] = useState(initial);
  return <DayChipBar selectedWeekday={day} onSelectWeekday={setDay} baseDate={baseDate} />;
};

const meta = {
  title: "Molecules/DayChipBar",
  component: DayChipBar,
  parameters: {
    layout: "padded",
    viewport: { defaultViewport: "mobile" },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DayChipBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Monday: Story = {
  args: {
    selectedWeekday: 0,
    onSelectWeekday: () => {},
    baseDate: new Date("2026-05-04"), // 월요일
  },
};

export const Wednesday: Story = {
  args: {
    selectedWeekday: 2,
    onSelectWeekday: () => {},
    baseDate: new Date("2026-05-04"),
  },
};

export const Sunday: Story = {
  args: {
    selectedWeekday: 6,
    onSelectWeekday: () => {},
    baseDate: new Date("2026-05-04"),
  },
};

export const InteractiveStory: Story = {
  args: {
    selectedWeekday: 0,
    onSelectWeekday: () => {},
    baseDate: new Date(),
  },
  render: () => <Interactive />,
};

export const AcrossMonthBoundary: Story = {
  args: {
    selectedWeekday: 0,
    onSelectWeekday: () => {},
    baseDate: new Date("2026-05-31"),
  },
  parameters: {
    docs: {
      description: { story: "월 경계 — 5/31(일)이 포함된 주" },
    },
  },
};
