import type { Meta, StoryObj } from '@storybook/react-vite';
import Typography from '../components/atoms/Typography';

const meta: Meta<typeof Typography> = {
  title: 'Atoms/Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['h1', 'h2', 'h3', 'h4', 'body', 'caption', 'label'],
    },
    color: {
      control: { type: 'select' },
      options: [
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'default',
      ],
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right'],
    },
    weight: {
      control: { type: 'select' },
      options: ['normal', 'medium', 'semibold', 'bold'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const H1: Story = {
  args: {
    variant: 'h1',
    children: '제목 1',
  },
};

export const H2: Story = {
  args: {
    variant: 'h2',
    children: '제목 2',
  },
};

export const H3: Story = {
  args: {
    variant: 'h3',
    children: '제목 3',
  },
};

export const H4: Story = {
  args: {
    variant: 'h4',
    children: '제목 4',
  },
};

export const Body: Story = {
  args: {
    variant: 'body',
    children: '본문 텍스트입니다. 일반적인 내용을 표시할 때 사용합니다.',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children:
      '캡션 텍스트입니다. 작은 설명이나 부가 정보를 표시할 때 사용합니다.',
  },
};

export const Label: Story = {
  args: {
    variant: 'label',
    children: '라벨 텍스트입니다. 폼 요소나 버튼에 사용됩니다.',
  },
};

export const PrimaryColor: Story = {
  args: {
    variant: 'h2',
    color: 'primary',
    children: 'Primary 색상 제목',
  },
};

export const SuccessColor: Story = {
  args: {
    variant: 'h3',
    color: 'success',
    children: 'Success 색상 제목',
  },
};

export const DangerColor: Story = {
  args: {
    variant: 'h3',
    color: 'danger',
    children: 'Danger 색상 제목',
  },
};

export const CenterAligned: Story = {
  args: {
    variant: 'h2',
    align: 'center',
    children: '가운데 정렬된 제목',
  },
};

export const BoldWeight: Story = {
  args: {
    variant: 'body',
    weight: 'bold',
    children: '굵은 본문 텍스트입니다.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        textAlign: 'left',
      }}
    >
      <Typography variant="h1">제목 1</Typography>
      <Typography variant="h2">제목 2</Typography>
      <Typography variant="h3">제목 3</Typography>
      <Typography variant="h4">제목 4</Typography>
      <Typography variant="body">본문 텍스트</Typography>
      <Typography variant="caption">캡션 텍스트</Typography>
      <Typography variant="label">라벨 텍스트</Typography>
    </div>
  ),
};
