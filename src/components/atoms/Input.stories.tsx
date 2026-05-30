import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Input } from "./Input";

type InputProps = React.ComponentProps<typeof Input>;
type InteractiveInputProps = Omit<InputProps, "onChange" | "value"> & {
  value?: string;
  onChange?: InputProps["onChange"];
};

const InteractiveInput = (props: InteractiveInputProps) => {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        props.onChange?.(e);
      }}
    />
  );
};

const meta = {
  title: "Atoms/Input",
  component: InteractiveInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    type: {
      control: "select",
      options: ["text", "email", "password", "number"],
    },
  },
} satisfies Meta<typeof InteractiveInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "medium",
    placeholder: "입력해주세요",
    value: "",
  },
};

export const WithValue: Story = {
  args: {
    size: "medium",
    placeholder: "이름",
    value: "홍길동",
  },
};

export const Error: Story = {
  args: {
    size: "medium",
    placeholder: "이메일",
    value: "invalid-email",
    error: true,
  },
};

export const Disabled: Story = {
  args: {
    size: "medium",
    placeholder: "비활성",
    value: "수정 불가",
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    size: "small",
    placeholder: "Small",
    value: "",
  },
};

export const Large: Story = {
  args: {
    size: "large",
    placeholder: "Large",
    value: "",
  },
};

export const Email: Story = {
  args: {
    size: "medium",
    type: "email",
    placeholder: "park@example.com",
    value: "",
  },
};

export const MaxLength: Story = {
  args: {
    size: "medium",
    placeholder: "최대 10자",
    value: "",
    maxLength: 10,
  },
};
