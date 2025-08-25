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
      options: ['text', 'email', 'password', 'number'],
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

export const Default: Story = {
  args: {
    placeholder: '텍스트를 입력하세요',
    value: '',
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const WithValue: Story = {
  args: {
    placeholder: '텍스트를 입력하세요',
    value: '입력된 텍스트',
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const Small: Story = {
  args: {
    placeholder: '작은 입력 필드',
    value: '',
    size: 'small',
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const Large: Story = {
  args: {
    placeholder: '큰 입력 필드',
    value: '',
    size: 'large',
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const WithError: Story = {
  args: {
    placeholder: '에러가 있는 입력 필드',
    value: '잘못된 입력',
    error: '올바른 형식으로 입력해주세요',
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const Disabled: Story = {
  args: {
    placeholder: '비활성화된 입력 필드',
    value: '수정할 수 없음',
    disabled: true,
    onChange: (value: string) => console.log('Input value:', value),
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: '이메일을 입력하세요',
    value: '',
    onChange: (value: string) => console.log('Email:', value),
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: '비밀번호를 입력하세요',
    value: '',
    onChange: (value: string) => console.log('Password:', value),
  },
};
