import type { Meta, StoryObj } from '@storybook/react-vite';
import FormField from '../components/molecules/FormField';

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
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
    label: '이름',
    name: 'name',
    value: '',
    onChange: (value: string) => console.log('Name:', value),
    placeholder: '이름을 입력하세요',
  },
};

export const Required: Story = {
  args: {
    label: '이메일',
    name: 'email',
    value: '',
    onChange: (value: string) => console.log('Email:', value),
    placeholder: '이메일을 입력하세요',
    type: 'email',
    required: true,
  },
};

export const WithValue: Story = {
  args: {
    label: '전화번호',
    name: 'phone',
    value: '010-1234-5678',
    onChange: (value: string) => console.log('Phone:', value),
    placeholder: '전화번호를 입력하세요',
    type: 'text',
  },
};

export const WithError: Story = {
  args: {
    label: '비밀번호',
    name: 'password',
    value: '123',
    onChange: (value: string) => console.log('Password:', value),
    placeholder: '비밀번호를 입력하세요',
    type: 'password',
    required: true,
    error: '비밀번호는 8자 이상이어야 합니다',
  },
};

export const Small: Story = {
  args: {
    label: '작은 입력 필드',
    name: 'small',
    value: '',
    onChange: (value: string) => console.log('Small:', value),
    placeholder: '작은 크기',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    label: '큰 입력 필드',
    name: 'large',
    value: '',
    onChange: (value: string) => console.log('Large:', value),
    placeholder: '큰 크기',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    label: '비활성화된 필드',
    name: 'disabled',
    value: '수정할 수 없음',
    onChange: (value: string) => console.log('Disabled:', value),
    placeholder: '비활성화됨',
    disabled: true,
  },
};

export const Number: Story = {
  args: {
    label: '나이',
    name: 'age',
    value: '',
    onChange: (value: string) => console.log('Age:', value),
    placeholder: '나이를 입력하세요',
    type: 'number',
  },
};

export const MultipleFields: Story = {
  render: () => (
    <div
      style={{
        width: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <FormField
        label="이름"
        name="name"
        value=""
        onChange={(value: string) => console.log('Name:', value)}
        placeholder="이름을 입력하세요"
        required
      />
      <FormField
        label="이메일"
        name="email"
        value=""
        onChange={(value: string) => console.log('Email:', value)}
        placeholder="이메일을 입력하세요"
        type="email"
        required
      />
      <FormField
        label="비밀번호"
        name="password"
        value=""
        onChange={(value: string) => console.log('Password:', value)}
        placeholder="비밀번호를 입력하세요"
        type="password"
        required
        error="비밀번호는 8자 이상이어야 합니다"
      />
    </div>
  ),
};
