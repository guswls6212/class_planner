import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import SegmentedButton from "./SegmentedButton";

type ColorByValue = "subject" | "teacher";
type ViewModeValue = "weekly" | "daily" | "monthly";

const ColorByExample = () => {
  const [value, setValue] = useState<ColorByValue>("subject");
  return (
    <SegmentedButton<ColorByValue>
      options={[
        { label: "과목별", value: "subject" },
        { label: "강사별", value: "teacher" },
      ] as const}
      value={value}
      onChange={setValue}
      aria-label="색상 기준 선택"
    />
  );
};

const ViewModeExample = () => {
  const [value, setValue] = useState<ViewModeValue>("weekly");
  return (
    <SegmentedButton<ViewModeValue>
      options={[
        { label: "주", value: "weekly" },
        { label: "일", value: "daily" },
        { label: "월", value: "monthly" },
      ] as const}
      value={value}
      onChange={setValue}
      aria-label="뷰 모드 선택"
    />
  );
};

const SingleOptionExample = () => {
  const [value, setValue] = useState<"only">("only");
  return (
    <SegmentedButton<"only">
      options={[{ label: "Only", value: "only" } as const]}
      value={value}
      onChange={setValue}
      aria-label="단일 옵션"
    />
  );
};

const FourOptionsExample = () => {
  const [value, setValue] = useState<string>("a");
  return (
    <SegmentedButton
      options={[
        { label: "옵션 A", value: "a" },
        { label: "옵션 B", value: "b" },
        { label: "옵션 C", value: "c" },
        { label: "옵션 D", value: "d" },
      ] as const}
      value={value}
      onChange={setValue}
      aria-label="4개 옵션"
    />
  );
};

const meta = {
  title: "Atoms/SegmentedButton",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ColorBy: Story = {
  render: () => <ColorByExample />,
};

export const ViewMode: Story = {
  render: () => <ViewModeExample />,
};

export const SingleOption: Story = {
  render: () => <SingleOptionExample />,
};

export const FourOptions: Story = {
  render: () => <FourOptionsExample />,
};
