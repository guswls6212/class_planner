import type { Meta, StoryObj } from '@storybook/react-vite';
import Input from '../components/atoms/Input';

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    error: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 입력
export const Default: Story = {
  args: {
    value: '',
    onChange: (value: string) => console.log('Input value:', value),
    placeholder: 'Enter text...',
  },
};

// 다양한 타입
export const Types: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
      }}
    >
      <Input
        type="text"
        value=""
        onChange={value => console.log('Text:', value)}
        placeholder="Text input"
      />
      <Input
        type="email"
        value=""
        onChange={value => console.log('Email:', value)}
        placeholder="Email input"
      />
      <Input
        type="password"
        value=""
        onChange={value => console.log('Password:', value)}
        placeholder="Password input"
      />
      <Input
        type="number"
        value=""
        onChange={value => console.log('Number:', value)}
        placeholder="Number input"
      />
      <Input
        type="search"
        value=""
        onChange={value => console.log('Search:', value)}
        placeholder="Search input"
      />
    </div>
  ),
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
      }}
    >
      <Input
        size="small"
        value=""
        onChange={value => console.log('Small:', value)}
        placeholder="Small input"
      />
      <Input
        size="medium"
        value=""
        onChange={value => console.log('Medium:', value)}
        placeholder="Medium input"
      />
      <Input
        size="large"
        value=""
        onChange={value => console.log('Large:', value)}
        placeholder="Large input"
      />
    </div>
  ),
};

// 상태별 입력
export const States: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
      }}
    >
      <Input
        value="Normal input"
        onChange={value => console.log('Normal:', value)}
        placeholder="Normal state"
      />
      <Input
        value="Disabled input"
        onChange={value => console.log('Disabled:', value)}
        placeholder="Disabled state"
        disabled
      />
      <Input
        value="Error input"
        onChange={value => console.log('Error:', value)}
        placeholder="Error state"
        error="This field is required"
      />
    </div>
  ),
};

// 아이콘이 있는 입력
export const WithIcons: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
      }}
    >
      <Input
        value=""
        onChange={value => console.log('With icon:', value)}
        placeholder="Input with icon"
        icon="🔍"
      />
      <Input
        value=""
        onChange={value => console.log('With icon:', value)}
        placeholder="Input with icon"
        icon="📧"
      />
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
        gap: '10px',
        width: '300px',
      }}
    >
      <Input
        type="search"
        size="large"
        value=""
        onChange={value => console.log('Search:', value)}
        placeholder="Search for anything..."
        icon="🔍"
      />
      <Input
        type="email"
        size="medium"
        value="user@example.com"
        onChange={value => console.log('Email:', value)}
        placeholder="Enter your email"
        icon="📧"
        error="Please enter a valid email"
      />
      <Input
        type="password"
        size="small"
        value=""
        onChange={value => console.log('Password:', value)}
        placeholder="Enter password"
        disabled
      />
    </div>
  ),
};
