import type { Meta, StoryObj } from '@storybook/react-vite';
import SessionModal from '../components/organisms/SessionModal';

const meta: Meta<typeof SessionModal> = {
  title: 'Organisms/SessionModal',
  component: SessionModal,
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
    isOpen: {
      control: 'boolean',
    },
    isEdit: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockSubjects = [
  { id: '1', name: '영어', color: '#3b82f6' },
  { id: '2', name: '수학', color: '#f59e0b' },
  { id: '3', name: '국어', color: '#10b981' },
  { id: '4', name: '과학', color: '#ef4444' },
  { id: '5', name: '사회', color: '#8b5cf6' },
];

const mockWeekdays = ['월', '화', '수', '목', '금', '토', '일'];

const mockData = {
  studentId: '1',
  weekday: 0,
  startTime: '09:00',
  endTime: '10:00',
};

export const AddSession: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '수업 추가',
    data: mockData,
    subjects: mockSubjects,
    weekdays: mockWeekdays,
    onSubmit: () => console.log('Session added!'),
    onCancel: () => console.log('Modal cancelled!'),
  },
};

export const EditSession: Story = {
  args: {
    isOpen: true,
    isEdit: true,
    title: '수업 편집',
    data: { ...mockData, startTime: '10:00', endTime: '11:00' },
    subjects: mockSubjects,
    weekdays: mockWeekdays,
    onSubmit: () => console.log('Session updated!'),
    onCancel: () => console.log('Modal cancelled!'),
    onDelete: () => console.log('Session deleted!'),
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    isEdit: false,
    title: '수업 추가',
    data: mockData,
    subjects: mockSubjects,
    weekdays: mockWeekdays,
    onSubmit: () => console.log('Session added!'),
    onCancel: () => console.log('Modal cancelled!'),
  },
};

export const LongSubjectList: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '수업 추가',
    data: mockData,
    subjects: [
      ...mockSubjects,
      { id: '6', name: '음악', color: '#06b6d4' },
      { id: '7', name: '미술', color: '#84cc16' },
      { id: '8', name: '체육', color: '#f97316' },
      { id: '9', name: '컴퓨터', color: '#6366f1' },
      { id: '10', name: '역사', color: '#a855f7' },
    ],
    weekdays: mockWeekdays,
    onSubmit: () => console.log('Session added!'),
    onCancel: () => console.log('Modal cancelled!'),
  },
};

export const DifferentTimes: Story = {
  args: {
    isOpen: true,
    isEdit: false,
    title: '수업 추가',
    data: { ...mockData, startTime: '14:30', endTime: '16:00' },
    subjects: mockSubjects,
    weekdays: mockWeekdays,
    onSubmit: () => console.log('Session added!'),
    onCancel: () => console.log('Modal cancelled!'),
  },
};
