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
    variant: {
      control: { type: 'select' },
      options: ['default', 'checkbox', 'inline', 'group'],
    },
    required: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    error: {
      control: { type: 'boolean' },
    },
    success: {
      control: { type: 'boolean' },
    },
    warning: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 라벨
export const Default: Story = {
  args: {
    children: 'Label Text',
  },
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Label size="small">Small Label</Label>
      <Label size="medium">Medium Label</Label>
      <Label size="large">Large Label</Label>
    </div>
  ),
};

// 다양한 variant
export const Variants: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Label variant="default">Default Label</Label>
      <Label variant="checkbox">Checkbox Label</Label>
      <Label variant="inline">Inline Label</Label>
      <Label variant="group">Group Label</Label>
    </div>
  ),
};

// 상태별 라벨
export const States: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Label>Normal Label</Label>
      <Label required>Required Label</Label>
      <Label disabled>Disabled Label</Label>
      <Label error>Error Label</Label>
      <Label success>Success Label</Label>
      <Label warning>Warning Label</Label>
    </div>
  ),
};

// 도움말 텍스트가 있는 라벨
export const WithHelpText: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <Label helpText="이 필드는 필수 입력 항목입니다.">Username</Label>
      <Label helpText="8자 이상 입력해주세요.">Password</Label>
      <Label helpText="올바른 이메일 형식으로 입력해주세요.">Email</Label>
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        alignItems: 'flex-start',
      }}
    >
      <Label
        size="large"
        variant="group"
        required
        helpText="사용자 계정 정보를 입력해주세요."
      >
        Account Information
      </Label>

      <Label
        size="medium"
        variant="checkbox"
        success
        helpText="이용약관에 동의해주세요."
      >
        Terms and Conditions
      </Label>

      <Label size="small" variant="inline" warning helpText="선택사항입니다.">
        Optional Field
      </Label>

      <Label
        size="medium"
        variant="default"
        error
        helpText="올바른 형식으로 입력해주세요."
      >
        Invalid Input
      </Label>
    </div>
  ),
};
