import type { Meta, StoryObj } from '@storybook/react-vite';
import Button from '../components/atoms/Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    loading: {
      control: { type: 'boolean' },
    },
    iconPosition: {
      control: { type: 'select' },
      options: ['left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 버튼
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

// 다양한 variant
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};

// 다양한 size
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};

// 상태별 버튼
export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
};

// 아이콘이 있는 버튼
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button icon="←" iconPosition="left">
        Left Icon
      </Button>
      <Button icon="→" iconPosition="right">
        Right Icon
      </Button>
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <Button variant="primary" size="large" icon="🚀" iconPosition="left">
        Launch App
      </Button>
      <Button variant="danger" size="small" loading>
        Delete
      </Button>
      <Button variant="outline" size="medium" disabled>
        Unavailable
      </Button>
    </div>
  ),
};
