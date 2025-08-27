import type { Meta, StoryObj } from '@storybook/react-vite';
import Card from '../components/molecules/Card';

const meta: Meta<typeof Card> = {
  title: 'Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'elevated', 'outlined'],
    },
    padding: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 카드
export const Default: Story = {
  args: {
    children: 'This is a basic card with default styling.',
  },
};

// 제목이 있는 카드
export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: 'This card has a title and content.',
  },
};

// 다양한 variant
export const Variants: Story = {
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
          Default
        </div>
        <Card variant="default">
          This is a default card with basic styling.
        </Card>
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Elevated
        </div>
        <Card variant="elevated">
          This is an elevated card with shadow effects.
        </Card>
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Outlined
        </div>
        <Card variant="outlined">
          This is an outlined card with transparent background.
        </Card>
      </div>
    </div>
  ),
};

// 다양한 padding
export const Paddings: Story = {
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
          Small Padding
        </div>
        <Card padding="small">This card has small padding (12px).</Card>
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Medium Padding
        </div>
        <Card padding="medium">This card has medium padding (16px).</Card>
      </div>
      <div>
        <div
          style={{
            marginBottom: '8px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Large Padding
        </div>
        <Card padding="large">This card has large padding (24px).</Card>
      </div>
    </div>
  ),
};

// 클릭 가능한 카드
export const Clickable: Story = {
  args: {
    title: 'Clickable Card',
    children: 'This card is clickable and will show hover effects.',
    onClick: () => alert('Card clicked!'),
  },
};

// 복합 콘텐츠
export const ComplexContent: Story = {
  args: {
    title: 'Complex Content Card',
    variant: 'elevated',
    padding: 'large',
    children: (
      <div>
        <p style={{ margin: '0 0 12px 0', color: 'var(--color-gray-700)' }}>
          This card contains complex content with multiple elements.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            Action 1
          </button>
          <button
            style={{
              padding: '8px 16px',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '4px',
              background: 'white',
            }}
          >
            Action 2
          </button>
        </div>
      </div>
    ),
  },
};

// 크기별 variant 조합
export const SizeVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '120px',
            fontSize: '12px',
            color: 'var(--color-gray-600)',
          }}
        >
          Small
        </div>
        <Card variant="default" padding="small" title="Small Card">
          Small padding card
        </Card>
        <Card variant="elevated" padding="small" title="Small Elevated">
          Small elevated card
        </Card>
        <Card variant="outlined" padding="small" title="Small Outlined">
          Small outlined card
        </Card>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '120px',
            fontSize: '14px',
            color: 'var(--color-gray-600)',
          }}
        >
          Medium
        </div>
        <Card variant="default" padding="medium" title="Medium Card">
          Medium padding card
        </Card>
        <Card variant="elevated" padding="medium" title="Medium Elevated">
          Medium elevated card
        </Card>
        <Card variant="outlined" padding="medium" title="Medium Outlined">
          Medium outlined card
        </Card>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '120px',
            fontSize: '16px',
            color: 'var(--color-gray-600)',
          }}
        >
          Large
        </div>
        <Card variant="default" padding="large" title="Large Card">
          Large padding card
        </Card>
        <Card variant="elevated" padding="large" title="Large Elevated">
          Large elevated card
        </Card>
        <Card variant="outlined" padding="large" title="Large Outlined">
          Large outlined card
        </Card>
      </div>
    </div>
  ),
};

// 인터랙티브 데모
export const InteractiveDemo: Story = {
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
        인터랙티브 카드 데모
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Card
          variant="default"
          padding="medium"
          title="기본 카드"
          onClick={() => alert('기본 카드 클릭됨!')}
        >
          <p style={{ margin: '0 0 12px 0' }}>클릭 가능한 기본 카드입니다.</p>
          <small style={{ color: 'var(--color-gray-600)' }}>
            호버 효과를 확인해보세요.
          </small>
        </Card>

        <Card
          variant="elevated"
          padding="large"
          title="강화된 카드"
          onClick={() => alert('강화된 카드 클릭됨!')}
        >
          <p style={{ margin: '0 0 12px 0' }}>그림자 효과가 있는 카드입니다.</p>
          <small style={{ color: 'var(--color-gray-600)' }}>
            호버 시 더 강한 그림자가 나타납니다.
          </small>
        </Card>

        <Card
          variant="outlined"
          padding="small"
          title="아웃라인 카드"
          onClick={() => alert('아웃라인 카드 클릭됨!')}
        >
          <p style={{ margin: '0 0 12px 0' }}>투명 배경의 카드입니다.</p>
          <small style={{ color: 'var(--color-gray-600)' }}>
            테두리만 있는 깔끔한 디자인.
          </small>
        </Card>
      </div>
    </div>
  ),
};
