import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemeToggle from '../components/atoms/ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Atoms/ThemeToggle',
  component: ThemeToggle,
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
      options: ['icon', 'text', 'both'],
    },
  },
  decorators: [
    Story => (
      <div style={{ padding: '20px', background: 'var(--color-gray-100)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 테마 토글
export const Default: Story = {
  args: {
    size: 'medium',
    variant: 'both',
  },
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '12px',
            color: 'var(--color-gray-600)',
          }}
        >
          Small
        </div>
        <ThemeToggle size="small" variant="both" />
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
        <ThemeToggle size="medium" variant="both" />
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '16px',
            color: 'var(--color-gray-600)',
          }}
        >
          Large
        </div>
        <ThemeToggle size="large" variant="both" />
      </div>
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
        gap: '15px',
        alignItems: 'center',
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
          Icon Only
        </div>
        <ThemeToggle size="medium" variant="icon" />
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Text Only
        </div>
        <ThemeToggle size="medium" variant="text" />
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Both
        </div>
        <ThemeToggle size="medium" variant="both" />
      </div>
    </div>
  ),
};

// 크기별 variant 조합
export const SizeVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div
          style={{
            width: '80px',
            fontSize: '12px',
            color: 'var(--color-gray-600)',
          }}
        >
          Small
        </div>
        <ThemeToggle size="small" variant="icon" />
        <ThemeToggle size="small" variant="text" />
        <ThemeToggle size="small" variant="both" />
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div
          style={{
            width: '80px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Medium
        </div>
        <ThemeToggle size="medium" variant="icon" />
        <ThemeToggle size="medium" variant="text" />
        <ThemeToggle size="medium" variant="both" />
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div
          style={{
            width: '80px',
            fontSize: '16px',
            color: 'var(--color-gray-600)',
          }}
        >
          Large
        </div>
        <ThemeToggle size="large" variant="icon" />
        <ThemeToggle size="large" variant="text" />
        <ThemeToggle size="large" variant="both" />
      </div>
    </div>
  ),
};

// 다크 테마 환경 시뮬레이션
export const DarkTheme: Story = {
  render: () => (
    <div
      style={{
        padding: '20px',
        background: 'var(--color-gray-900)',
        color: 'white',
      }}
    >
      <div style={{ marginBottom: '20px', fontSize: '16px' }}>
        다크 테마 환경
      </div>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <ThemeToggle size="medium" variant="both" />
        <ThemeToggle size="medium" variant="icon" />
        <ThemeToggle size="medium" variant="text" />
      </div>
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div style={{ padding: '20px', background: 'var(--color-gray-50)' }}>
      <div
        style={{
          marginBottom: '20px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'var(--color-gray-800)',
        }}
      >
        테마 토글 컴포넌트 데모
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {/* 아이콘 전용 */}
        <div>
          <div
            style={{
              marginBottom: '10px',
              fontSize: '14px',
              color: 'var(--color-gray-700)',
            }}
          >
            아이콘 전용 (다양한 크기)
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <ThemeToggle size="small" variant="icon" />
            <ThemeToggle size="medium" variant="icon" />
            <ThemeToggle size="large" variant="icon" />
          </div>
        </div>

        {/* 텍스트 전용 */}
        <div>
          <div
            style={{
              marginBottom: '10px',
              fontSize: '14px',
              color: 'var(--color-gray-700)',
            }}
          >
            텍스트 전용 (다양한 크기)
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <ThemeToggle size="small" variant="text" />
            <ThemeToggle size="medium" variant="text" />
            <ThemeToggle size="large" variant="text" />
          </div>
        </div>

        {/* 아이콘 + 텍스트 */}
        <div>
          <div
            style={{
              marginBottom: '10px',
              fontSize: '14px',
              color: 'var(--color-gray-700)',
            }}
          >
            아이콘 + 텍스트 (다양한 크기)
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <ThemeToggle size="small" variant="both" />
            <ThemeToggle size="medium" variant="both" />
            <ThemeToggle size="large" variant="both" />
          </div>
        </div>
      </div>
    </div>
  ),
};
