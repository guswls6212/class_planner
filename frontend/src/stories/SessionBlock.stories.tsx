import type { Meta, StoryObj } from '@storybook/react-vite';
import SessionBlock from '../components/molecules/SessionBlock';

const meta: Meta<typeof SessionBlock> = {
  title: 'Molecules/SessionBlock',
  component: SessionBlock,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a1a' },
        { name: 'light', value: '#f5f5f5' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    left: {
      control: { type: 'range', min: 0, max: 600, step: 10 },
    },
    width: {
      control: { type: 'range', min: 60, max: 300, step: 10 },
    },
    yOffset: {
      control: { type: 'range', min: 0, max: 200, step: 32 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockSubject = {
  id: '1',
  name: '영어',
  color: '#3b82f6',
};

const mockSession = {
  id: '1',
  enrollmentId: '1',
  weekday: 0,
  startsAt: '09:00',
  endsAt: '11:00',
};

export const Default: Story = {
  args: {
    session: mockSession,
    subject: mockSubject,
    left: 0,
    width: 240,
    yOffset: 0,
    onClick: () => alert('Session clicked!'),
  },
};

export const LongSession: Story = {
  args: {
    session: { ...mockSession, startsAt: '09:00', endsAt: '13:00' },
    subject: mockSubject,
    left: 0,
    width: 480,
    yOffset: 0,
    onClick: () => alert('Long session clicked!'),
  },
};

export const ShortSession: Story = {
  args: {
    session: { ...mockSession, startsAt: '10:00', endsAt: '10:30' },
    subject: mockSubject,
    left: 120,
    width: 60,
    yOffset: 0,
    onClick: () => alert('Short session clicked!'),
  },
};

export const OverlappingSessions: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '600px',
        height: '300px',
        background: '#2a2a2a',
      }}
    >
      <SessionBlock
        session={mockSession}
        subject={mockSubject}
        left={0}
        width={240}
        yOffset={0}
        onClick={() => alert('First session clicked!')}
      />
      <SessionBlock
        session={{
          ...mockSession,
          id: '2',
          startsAt: '10:00',
          endsAt: '12:00',
        }}
        subject={{ ...mockSubject, name: '수학', color: '#f59e0b' }}
        left={120}
        width={180}
        yOffset={32}
        onClick={() => alert('Second session clicked!')}
      />
      <SessionBlock
        session={{
          ...mockSession,
          id: '3',
          startsAt: '11:00',
          endsAt: '13:00',
        }}
        subject={{ ...mockSubject, name: '국어', color: '#10b981' }}
        left={240}
        width={180}
        yOffset={64}
        onClick={() => alert('Third session clicked!')}
      />
    </div>
  ),
};

export const DifferentSubjects: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '600px',
        height: '200px',
        background: '#2a2a2a',
      }}
    >
      <SessionBlock
        session={mockSession}
        subject={{ ...mockSubject, name: '영어', color: '#3b82f6' }}
        left={0}
        width={120}
        yOffset={0}
        onClick={() => alert('English clicked!')}
      />
      <SessionBlock
        session={{
          ...mockSession,
          id: '2',
          startsAt: '10:00',
          endsAt: '11:00',
        }}
        subject={{ ...mockSubject, name: '수학', color: '#f59e0b' }}
        left={120}
        width={120}
        yOffset={0}
        onClick={() => alert('Math clicked!')}
      />
      <SessionBlock
        session={{
          ...mockSession,
          id: '3',
          startsAt: '11:00',
          endsAt: '12:00',
        }}
        subject={{ ...mockSubject, name: '국어', color: '#10b981' }}
        left={240}
        width={120}
        yOffset={0}
        onClick={() => alert('Korean clicked!')}
      />
      <SessionBlock
        session={{
          ...mockSession,
          id: '4',
          startsAt: '12:00',
          endsAt: '13:00',
        }}
        subject={{ ...mockSubject, name: '과학', color: '#ef4444' }}
        left={360}
        width={120}
        yOffset={0}
        onClick={() => alert('Science clicked!')}
      />
    </div>
  ),
};
