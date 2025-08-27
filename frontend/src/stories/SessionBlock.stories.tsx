import type { Meta, StoryObj } from '@storybook/react-vite';
import SessionBlock from '../components/molecules/SessionBlock';

const meta: Meta<typeof SessionBlock> = {
  title: 'Molecules/SessionBlock',
  component: SessionBlock,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    left: {
      control: { type: 'number' },
    },
    width: {
      control: { type: 'number' },
    },
    yOffset: {
      control: { type: 'number' },
    },
    onClick: { action: 'clicked' },
  },
  decorators: [
    Story => (
      <div
        style={{
          position: 'relative',
          width: '600px',
          height: '200px',
          background: 'var(--color-gray-100)',
          border: '1px solid var(--color-gray-300)',
          padding: '20px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 세션 블록
export const Default: Story = {
  args: {
    session: {
      id: '1',
      enrollmentId: '1',
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:30',
      room: 'A101',
    },
    subject: {
      id: '1',
      name: 'Mathematics',
      color: '#3b82f6',
    },
    left: 100,
    width: 200,
    yOffset: 0,
    onClick: () => console.log('Session clicked'),
  },
};

// 다양한 과목 색상
export const SubjectColors: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '600px', height: '200px' }}>
      <SessionBlock
        session={{
          id: '1',
          enrollmentId: '1',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'A101',
        }}
        subject={{
          id: '1',
          name: 'Mathematics',
          color: '#3b82f6',
        }}
        left={50}
        width={150}
        yOffset={0}
        onClick={() => console.log('Math clicked')}
      />

      <SessionBlock
        session={{
          id: '2',
          enrollmentId: '2',
          weekday: 0,
          startsAt: '10:30',
          endsAt: '12:00',
          room: 'B202',
        }}
        subject={{
          id: '2',
          name: 'Physics',
          color: '#ef4444',
        }}
        left={250}
        width={150}
        yOffset={0}
        onClick={() => console.log('Physics clicked')}
      />

      <SessionBlock
        session={{
          id: '3',
          enrollmentId: '3',
          weekday: 0,
          startsAt: '13:00',
          endsAt: '14:30',
          room: 'C303',
        }}
        subject={{
          id: '3',
          name: 'Chemistry',
          color: '#10b981',
        }}
        left={450}
        width={150}
        yOffset={0}
        onClick={() => console.log('Chemistry clicked')}
      />
    </div>
  ),
};

// 다양한 크기
export const Sizes: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '600px', height: '200px' }}>
      <SessionBlock
        session={{
          id: '1',
          enrollmentId: '1',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '09:30',
          room: 'A101',
        }}
        subject={{
          id: '1',
          name: 'Short Session',
          color: '#8b5cf6',
        }}
        left={50}
        width={100}
        yOffset={0}
        onClick={() => console.log('Short session clicked')}
      />

      <SessionBlock
        session={{
          id: '2',
          enrollmentId: '2',
          weekday: 0,
          startsAt: '10:00',
          endsAt: '11:30',
          room: 'B202',
        }}
        subject={{
          id: '2',
          name: 'Medium Session',
          color: '#f59e0b',
        }}
        left={200}
        width={200}
        yOffset={0}
        onClick={() => console.log('Medium session clicked')}
      />

      <SessionBlock
        session={{
          id: '3',
          enrollmentId: '3',
          weekday: 0,
          startsAt: '13:00',
          endsAt: '15:00',
          room: 'C303',
        }}
        subject={{
          id: '3',
          name: 'Long Session',
          color: '#ec4899',
        }}
        left={450}
        width={300}
        yOffset={0}
        onClick={() => console.log('Long session clicked')}
      />
    </div>
  ),
};

// 여러 행에 배치
export const MultipleRows: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '600px', height: '300px' }}>
      {/* 첫 번째 행 */}
      <SessionBlock
        session={{
          id: '1',
          enrollmentId: '1',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'A101',
        }}
        subject={{
          id: '1',
          name: 'Row 1 - Math',
          color: '#3b82f6',
        }}
        left={50}
        width={200}
        yOffset={0}
        onClick={() => console.log('Row 1 clicked')}
      />

      {/* 두 번째 행 */}
      <SessionBlock
        session={{
          id: '2',
          enrollmentId: '2',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'B202',
        }}
        subject={{
          id: '2',
          name: 'Row 2 - Physics',
          color: '#ef4444',
        }}
        left={50}
        width={200}
        yOffset={40}
        onClick={() => console.log('Row 2 clicked')}
      />

      {/* 세 번째 행 */}
      <SessionBlock
        session={{
          id: '3',
          enrollmentId: '3',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'C303',
        }}
        subject={{
          id: '3',
          name: 'Row 3 - Chemistry',
          color: '#10b981',
        }}
        left={50}
        width={200}
        yOffset={80}
        onClick={() => console.log('Row 3 clicked')}
      />

      {/* 네 번째 행 */}
      <SessionBlock
        session={{
          id: '4',
          enrollmentId: '4',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'D404',
        }}
        subject={{
          id: '4',
          name: 'Row 4 - Biology',
          color: '#f59e0b',
        }}
        left={50}
        width={200}
        yOffset={120}
        onClick={() => console.log('Row 4 clicked')}
      />
    </div>
  ),
};

// 시간대별 배치
export const TimeSlots: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '800px', height: '200px' }}>
      {/* 9:00-10:30 */}
      <SessionBlock
        session={{
          id: '1',
          enrollmentId: '1',
          weekday: 0,
          startsAt: '09:00',
          endsAt: '10:30',
          room: 'A101',
        }}
        subject={{
          id: '1',
          name: '9:00-10:30',
          color: '#3b82f6',
        }}
        left={50}
        width={150}
        yOffset={0}
        onClick={() => console.log('9:00-10:30 clicked')}
      />

      {/* 10:30-12:00 */}
      <SessionBlock
        session={{
          id: '2',
          enrollmentId: '2',
          weekday: 0,
          startsAt: '10:30',
          endsAt: '12:00',
          room: 'B202',
        }}
        subject={{
          id: '2',
          name: '10:30-12:00',
          color: '#ef4444',
        }}
        left={250}
        width={150}
        yOffset={0}
        onClick={() => console.log('10:30-12:00 clicked')}
      />

      {/* 13:00-14:30 */}
      <SessionBlock
        session={{
          id: '3',
          enrollmentId: '3',
          weekday: 0,
          startsAt: '13:00',
          endsAt: '14:30',
          room: 'C303',
        }}
        subject={{
          id: '3',
          name: '13:00-14:30',
          color: '#10b981',
        }}
        left={450}
        width={150}
        yOffset={0}
        onClick={() => console.log('13:00-14:30 clicked')}
      />

      {/* 14:30-16:00 */}
      <SessionBlock
        session={{
          id: '4',
          enrollmentId: '4',
          weekday: 0,
          startsAt: '14:30',
          endsAt: '16:00',
          room: 'D404',
        }}
        subject={{
          id: '4',
          name: '14:30-16:00',
          color: '#f59e0b',
        }}
        left={650}
        width={150}
        yOffset={0}
        onClick={() => console.log('14:30-16:00 clicked')}
      />
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '800px', height: '400px' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          fontSize: '14px',
          color: 'var(--color-gray-600)',
          fontWeight: 'bold',
        }}
      >
        복합 세션 블록 데모
      </div>

      {/* 다양한 시간대와 과목 */}
      <SessionBlock
        session={{
          id: '1',
          enrollmentId: '1',
          weekday: 0,
          startsAt: '08:30',
          endsAt: '10:00',
          room: 'A101',
        }}
        subject={{
          id: '1',
          name: 'Advanced Math',
          color: '#3b82f6',
        }}
        left={50}
        width={180}
        yOffset={40}
        onClick={() => console.log('Advanced Math clicked')}
      />

      <SessionBlock
        session={{
          id: '2',
          enrollmentId: '2',
          weekday: 0,
          startsAt: '10:00',
          endsAt: '11:30',
          room: 'B202',
        }}
        subject={{
          id: '2',
          name: 'Physics Lab',
          color: '#ef4444',
        }}
        left={250}
        width={180}
        yOffset={40}
        onClick={() => console.log('Physics Lab clicked')}
      />

      <SessionBlock
        session={{
          id: '3',
          enrollmentId: '3',
          weekday: 0,
          startsAt: '13:00',
          endsAt: '15:00',
          room: 'C303',
        }}
        subject={{
          id: '3',
          name: 'Chemistry Seminar',
          color: '#10b981',
        }}
        left={450}
        width={220}
        yOffset={40}
        onClick={() => console.log('Chemistry Seminar clicked')}
      />

      {/* 두 번째 행 */}
      <SessionBlock
        session={{
          id: '4',
          enrollmentId: '4',
          weekday: 0,
          startsAt: '08:30',
          endsAt: '09:30',
          room: 'D404',
        }}
        subject={{
          id: '4',
          name: 'Short Session',
          color: '#8b5cf6',
        }}
        left={50}
        width={120}
        yOffset={120}
        onClick={() => console.log('Short Session clicked')}
      />

      <SessionBlock
        session={{
          id: '5',
          enrollmentId: '5',
          weekday: 0,
          startsAt: '09:30',
          endsAt: '11:00',
          room: 'E505',
        }}
        subject={{
          id: '5',
          name: 'Biology Lecture',
          color: '#f59e0b',
        }}
        left={200}
        width={180}
        yOffset={120}
        onClick={() => console.log('Biology Lecture clicked')}
      />

      <SessionBlock
        session={{
          id: '6',
          enrollmentId: '6',
          weekday: 0,
          startsAt: '11:00',
          endsAt: '12:30',
          room: 'F606',
        }}
        subject={{
          id: '6',
          name: 'Computer Science',
          color: '#ec4899',
        }}
        left={410}
        width={180}
        yOffset={120}
        onClick={() => console.log('Computer Science clicked')}
      />
    </div>
  ),
};
