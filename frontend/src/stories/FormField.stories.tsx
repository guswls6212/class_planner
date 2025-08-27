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
    error: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 폼 필드
export const Default: Story = {
  args: {
    label: 'Username',
    name: 'username',
    value: '',
    onChange: (value: string) => console.log('Username changed:', value),
    placeholder: 'Enter your username',
  },
};

// 필수 입력 필드
export const Required: Story = {
  args: {
    label: 'Email Address',
    name: 'email',
    value: '',
    onChange: (value: string) => console.log('Email changed:', value),
    placeholder: 'Enter your email',
    type: 'email',
    required: true,
  },
};

// 에러가 있는 필드
export const WithError: Story = {
  args: {
    label: 'Password',
    name: 'password',
    value: '',
    onChange: (value: string) => console.log('Password changed:', value),
    placeholder: 'Enter your password',
    type: 'password',
    required: true,
    error: 'Password must be at least 8 characters long',
  },
};

// 비활성화된 필드
export const Disabled: Story = {
  args: {
    label: 'Account ID',
    name: 'accountId',
    value: 'ACC-12345',
    onChange: (value: string) => console.log('Account ID changed:', value),
    disabled: true,
  },
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'stretch',
        width: '300px',
      }}
    >
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Small
        </div>
        <FormField
          label="Small Field"
          name="small"
          value=""
          onChange={(value: string) => console.log('Small changed:', value)}
          size="small"
        />
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Medium
        </div>
        <FormField
          label="Medium Field"
          name="medium"
          value=""
          onChange={(value: string) => console.log('Medium changed:', value)}
          size="medium"
        />
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Large
        </div>
        <FormField
          label="Large Field"
          name="large"
          value=""
          onChange={(value: string) => console.log('Large changed:', value)}
          size="large"
        />
      </div>
    </div>
  ),
};

// 다양한 타입
export const Types: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'stretch',
        width: '300px',
      }}
    >
      <FormField
        label="Text Input"
        name="text"
        value=""
        onChange={(value: string) => console.log('Text changed:', value)}
        type="text"
        placeholder="Enter text"
      />
      <FormField
        label="Email Input"
        name="email"
        value=""
        onChange={(value: string) => console.log('Email changed:', value)}
        type="email"
        placeholder="Enter email"
      />
      <FormField
        label="Password Input"
        name="password"
        value=""
        onChange={(value: string) => console.log('Password changed:', value)}
        type="password"
        placeholder="Enter password"
      />
      <FormField
        label="Number Input"
        name="number"
        value=""
        onChange={(value: string) => console.log('Number changed:', value)}
        type="number"
        placeholder="Enter number"
      />
    </div>
  ),
};

// 커스텀 입력 요소
export const CustomInput: Story = {
  args: {
    label: 'Custom Input',
    name: 'custom',
    value: '',
    onChange: (value: string) => console.log('Custom changed:', value),
    children: (
      <textarea
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--color-gray-300)',
          borderRadius: '4px',
          fontSize: '14px',
          resize: 'vertical',
          minHeight: '80px',
        }}
        placeholder="Enter your message here..."
      />
    ),
  },
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div
      style={{
        padding: '20px',
        background: 'var(--color-gray-50)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          marginBottom: '20px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'var(--color-gray-800)',
        }}
      >
        사용자 등록 폼
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '400px',
        }}
      >
        <FormField
          label="Full Name"
          name="fullName"
          value=""
          onChange={(value: string) => console.log('Full name changed:', value)}
          placeholder="Enter your full name"
          required={true}
          size="large"
        />

        <FormField
          label="Email Address"
          name="email"
          value=""
          onChange={(value: string) => console.log('Email changed:', value)}
          placeholder="Enter your email address"
          type="email"
          required={true}
          error="Please enter a valid email address"
        />

        <FormField
          label="Phone Number"
          name="phone"
          value=""
          onChange={(value: string) => console.log('Phone changed:', value)}
          placeholder="Enter your phone number"
          type="number"
          size="medium"
        />

        <FormField
          label="Bio"
          name="bio"
          value=""
          onChange={(value: string) => console.log('Bio changed:', value)}
          children={
            <textarea
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '100px',
              }}
              placeholder="Tell us about yourself..."
            />
          }
        />

        <FormField
          label="Account Type"
          name="accountType"
          value=""
          onChange={(value: string) =>
            console.log('Account type changed:', value)
          }
          children={
            <select
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="">Select account type</option>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          }
        />
      </div>
    </div>
  ),
};
