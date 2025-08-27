import type { Meta, StoryObj } from '@storybook/react-vite';
import SessionModal from '../components/organisms/SessionModal';

const meta: Meta<typeof SessionModal> = {
  title: 'Organisms/SessionModal',
  component: SessionModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: { type: 'boolean' },
    },
    isEdit: {
      control: { type: 'boolean' },
    },
    title: {
      control: { type: 'text' },
    },
    onSubmit: { action: 'submitted' },
    onCancel: { action: 'cancelled' },
    onDelete: { action: 'deleted' },
  },
  decorators: [
    Story => (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          background: 'var(--color-gray-100)',
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

// 기본 모달 (추가 모드)
export const Default: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '새 세션 추가',
    data: {
      studentId: 'student1',
      weekday: 0,
      startTime: '09:00',
      endTime: '10:00',
    },
    subjects: [
      { id: '1', name: 'Mathematics', color: '#3b82f6' },
      { id: '2', name: 'Physics', color: '#ef4444' },
      { id: '3', name: 'Chemistry', color: '#10b981' },
      { id: '4', name: 'Biology', color: '#f59e0b' },
      { id: '5', name: 'Computer Science', color: '#8b5cf6' },
    ],
    weekdays: ['월요일', '화요일', '수요일', '목요일', '금요일'],
    onSubmit: () => console.log('Session submitted'),
    onCancel: () => console.log('Session cancelled'),
  },
};

// 편집 모드 모달
export const EditMode: Story = {
  args: {
    isOpen: true,
    isEdit: true,
    title: '세션 편집',
    data: {
      studentId: 'student1',
      weekday: 2,
      startTime: '14:00',
      endTime: '15:30',
    },
    subjects: [
      { id: '1', name: 'Mathematics', color: '#3b82f6' },
      { id: '2', name: 'Physics', color: '#ef4444' },
      { id: '3', name: 'Chemistry', color: '#10b981' },
      { id: '4', name: 'Biology', color: '#f59e0b' },
      { id: '5', name: 'Computer Science', color: '#8b5cf6' },
    ],
    weekdays: ['월요일', '화요일', '수요일', '목요일', '금요일'],
    onSubmit: () => console.log('Session updated'),
    onCancel: () => console.log('Edit cancelled'),
    onDelete: () => console.log('Session deleted'),
  },
};

// 다양한 과목들
export const ManySubjects: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '과목 선택 (많은 옵션)',
    data: {
      studentId: 'student1',
      weekday: 0,
      startTime: '09:00',
      endTime: '10:00',
    },
    subjects: [
      { id: '1', name: 'Mathematics', color: '#3b82f6' },
      { id: '2', name: 'Physics', color: '#ef4444' },
      { id: '3', name: 'Chemistry', color: '#10b981' },
      { id: '4', name: 'Biology', color: '#f59e0b' },
      { id: '5', name: 'Computer Science', color: '#8b5cf6' },
      { id: '6', name: 'English Literature', color: '#ec4899' },
      { id: '7', name: 'History', color: '#06b6d4' },
      { id: '8', name: 'Geography', color: '#84cc16' },
      { id: '9', name: 'Art', color: '#f97316' },
      { id: '10', name: 'Music', color: '#a855f7' },
      { id: '11', name: 'Physical Education', color: '#22c55e' },
      { id: '12', name: 'Economics', color: '#eab308' },
    ],
    weekdays: ['월요일', '화요일', '수요일', '목요일', '금요일'],
    onSubmit: () => console.log('Session submitted'),
    onCancel: () => console.log('Session cancelled'),
  },
};

// 다양한 요일들
export const ManyWeekdays: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '요일 선택 (많은 옵션)',
    data: {
      studentId: 'student1',
      weekday: 0,
      startTime: '09:00',
      endTime: '10:00',
    },
    subjects: [
      { id: '1', name: 'Mathematics', color: '#3b82f6' },
      { id: '2', name: 'Physics', color: '#ef4444' },
    ],
    weekdays: [
      '월요일',
      '화요일',
      '수요일',
      '목요일',
      '금요일',
      '토요일',
      '일요일',
      '공휴일',
      '방학',
      '특별활동',
    ],
    onSubmit: () => console.log('Session submitted'),
    onCancel: () => console.log('Session cancelled'),
  },
};

// 다양한 시간대
export const DifferentTimeSlots: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 오전 시간대 */}
      <SessionModal
        isOpen={true}
        isEdit={false}
        title="오전 세션 (09:00-10:00)"
        data={{
          studentId: 'student1',
          weekday: 0,
          startTime: '09:00',
          endTime: '10:00',
        }}
        subjects={[
          { id: '1', name: 'Mathematics', color: '#3b82f6' },
          { id: '2', name: 'Physics', color: '#ef4444' },
        ]}
        weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
        onSubmit={() => console.log('Morning session submitted')}
        onCancel={() => console.log('Morning session cancelled')}
      />

      {/* 오후 시간대 */}
      <div style={{ position: 'absolute', top: '200px', left: '50px' }}>
        <SessionModal
          isOpen={true}
          isEdit={false}
          title="오후 세션 (14:00-15:30)"
          data={{
            studentId: 'student1',
            weekday: 0,
            startTime: '14:00',
            endTime: '15:30',
          }}
          subjects={[
            { id: '1', name: 'Mathematics', color: '#3b82f6' },
            { id: '2', name: 'Physics', color: '#ef4444' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Afternoon session submitted')}
          onCancel={() => console.log('Afternoon session cancelled')}
        />
      </div>

      {/* 저녁 시간대 */}
      <div style={{ position: 'absolute', top: '400px', left: '100px' }}>
        <SessionModal
          isOpen={true}
          isEdit={false}
          title="저녁 세션 (19:00-20:30)"
          data={{
            studentId: 'student1',
            weekday: 0,
            startTime: '19:00',
            endTime: '20:30',
          }}
          subjects={[
            { id: '1', name: 'Mathematics', color: '#3b82f6' },
            { id: '2', name: 'Physics', color: '#ef4444' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Evening session submitted')}
          onCancel={() => console.log('Evening session cancelled')}
        />
      </div>
    </div>
  ),
};

// 모달 상태 변화
export const ModalStates: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3>모달 상태 변화 데모</h3>
        <p>아래 모달들은 각각 다른 상태를 보여줍니다.</p>
      </div>

      {/* 닫힌 모달 */}
      <div style={{ marginBottom: '20px' }}>
        <h4>닫힌 모달 (isOpen: false)</h4>
        <SessionModal
          isOpen={false}
          isEdit={false}
          title="닫힌 모달"
          data={{
            studentId: 'student1',
            weekday: 0,
            startTime: '09:00',
            endTime: '10:00',
          }}
          subjects={[{ id: '1', name: 'Mathematics', color: '#3b82f6' }]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Session submitted')}
          onCancel={() => console.log('Session cancelled')}
        />
      </div>

      {/* 열린 모달 - 추가 모드 */}
      <div style={{ marginBottom: '20px' }}>
        <h4>열린 모달 - 추가 모드 (isEdit: false)</h4>
        <SessionModal
          isOpen={true}
          isEdit={false}
          title="새 세션 추가"
          data={{
            studentId: 'student1',
            weekday: 0,
            startTime: '09:00',
            endTime: '10:00',
          }}
          subjects={[
            { id: '1', name: 'Mathematics', color: '#3b82f6' },
            { id: '2', name: 'Physics', color: '#ef4444' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Session submitted')}
          onCancel={() => console.log('Session cancelled')}
        />
      </div>

      {/* 열린 모달 - 편집 모드 */}
      <div style={{ marginBottom: '20px' }}>
        <h4>열린 모달 - 편집 모드 (isEdit: true)</h4>
        <SessionModal
          isOpen={true}
          isEdit={true}
          title="세션 편집"
          data={{
            studentId: 'student1',
            weekday: 2,
            startTime: '14:00',
            endTime: '15:30',
          }}
          subjects={[
            { id: '1', name: 'Mathematics', color: '#3b82f6' },
            { id: '2', name: 'Physics', color: '#ef4444' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Session updated')}
          onCancel={() => console.log('Edit cancelled')}
          onDelete={() => console.log('Session deleted')}
        />
      </div>
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          fontSize: '16px',
          color: 'var(--color-gray-800)',
          fontWeight: 'bold',
          marginBottom: '20px',
        }}
      >
        복합 SessionModal 시나리오
      </div>

      {/* 첫 번째 모달 - 수학 과목 */}
      <div style={{ position: 'absolute', top: '60px', left: '10px' }}>
        <SessionModal
          isOpen={true}
          isEdit={false}
          title="수학 과목 세션 추가"
          data={{
            studentId: 'math-student',
            weekday: 0,
            startTime: '09:00',
            endTime: '10:30',
          }}
          subjects={[
            { id: '1', name: 'Mathematics', color: '#3b82f6' },
            { id: '2', name: 'Advanced Math', color: '#1d4ed8' },
            { id: '3', name: 'Calculus', color: '#1e40af' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Math session submitted')}
          onCancel={() => console.log('Math session cancelled')}
        />
      </div>

      {/* 두 번째 모달 - 과학 과목 */}
      <div style={{ position: 'absolute', top: '60px', left: '400px' }}>
        <SessionModal
          isOpen={true}
          isEdit={true}
          title="과학 과목 세션 편집"
          data={{
            studentId: 'science-student',
            weekday: 2,
            startTime: '13:00',
            endTime: '15:00',
          }}
          subjects={[
            { id: '4', name: 'Physics', color: '#ef4444' },
            { id: '5', name: 'Chemistry', color: '#10b981' },
            { id: '6', name: 'Biology', color: '#f59e0b' },
            { id: '7', name: 'Earth Science', color: '#84cc16' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Science session updated')}
          onCancel={() => console.log('Science edit cancelled')}
          onDelete={() => console.log('Science session deleted')}
        />
      </div>

      {/* 세 번째 모달 - 언어 과목 */}
      <div style={{ position: 'absolute', top: '60px', left: '800px' }}>
        <SessionModal
          isOpen={true}
          isEdit={false}
          title="언어 과목 세션 추가"
          data={{
            studentId: 'language-student',
            weekday: 4,
            startTime: '16:00',
            endTime: '17:30',
          }}
          subjects={[
            { id: '8', name: 'English', color: '#8b5cf6' },
            { id: '9', name: 'Korean', color: '#ec4899' },
            { id: '10', name: 'Chinese', color: '#06b6d4' },
            { id: '11', name: 'Japanese', color: '#f97316' },
          ]}
          weekdays={['월요일', '화요일', '수요일', '목요일', '금요일']}
          onSubmit={() => console.log('Language session submitted')}
          onCancel={() => console.log('Language session cancelled')}
        />
      </div>
    </div>
  ),
};
