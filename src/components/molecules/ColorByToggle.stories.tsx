import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import ColorByToggle from "./ColorByToggle";
import type { ColorByMode } from "@/hooks/useColorBy";

const ColorByToggleInteractive = () => {
  const [mode, setMode] = useState<ColorByMode>("subject");
  return <ColorByToggle colorBy={mode} onChange={setMode} />;
};

const meta = {
  title: "Molecules/ColorByToggle",
  component: ColorByToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ColorByToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subject: Story = {
  args: {
    colorBy: "subject",
    onChange: () => {},
  },
};

export const Teacher: Story = {
  args: {
    colorBy: "teacher",
    onChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    colorBy: "subject",
    onChange: () => {},
  },
  render: () => <ColorByToggleInteractive />,
};
