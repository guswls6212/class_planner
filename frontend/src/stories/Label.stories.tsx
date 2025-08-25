import type { Meta, StoryObj } from '@storybook/react-vite';
import Label from '../components/atoms/Label';

const meta: Meta<typeof Label> = {
  title: 'Atoms/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    required: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '기본 라벨',
  },
};

export const Required: Story = {
  args: {
    children: '필수 입력 필드',
    required: true,
  },
};

export const Small: Story = {
  args: {
    children: '작은 라벨',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    children: '큰 라벨',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    children: '비활성화된 라벨',
    disabled: true,
  },
};

export const WithHtmlFor: Story = {
  args: {
    children: '연결된 라벨',
    htmlFor: 'input-field',
  },
};

export const RequiredAndLarge: Story = {
  args: {
    children: '필수 입력 필드 (큰 크기)',
    required: true,
    size: 'large',
  },
};
