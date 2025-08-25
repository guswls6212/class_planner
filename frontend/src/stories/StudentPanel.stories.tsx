import type { Meta, StoryObj } from '@storybook/react-vite';
import StudentPanel from '../components/organisms/StudentPanel';

const meta: Meta<typeof StudentPanel> = {
  title: 'Organisms/StudentPanel',
  component: StudentPanel,
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
    panelPos: {
      control: 'object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockStudents = [
  { id: '1', name: '김철수' },
  { id: '2', name: '이영희' },
  { id: '3', name: '박민수' },
  { id: '4', name: '정수진' },
  { id: '5', name: '최지훈' },
];

export const Default: Story = {
  args: {
    students: mockStudents,
    selectedStudentId: '',
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    panelPos: { x: 0, y: 0 },
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

export const WithSelectedStudent: Story = {
  args: {
    students: mockStudents,
    selectedStudentId: '2',
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    panelPos: { x: 0, y: 0 },
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

export const EmptyStudents: Story = {
  args: {
    students: [],
    selectedStudentId: '',
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    panelPos: { x: 0, y: 0 },
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

export const ManyStudents: Story = {
  args: {
    students: [
      ...mockStudents,
      { id: '6', name: '강동원' },
      { id: '7', name: '윤서연' },
      { id: '8', name: '임태현' },
      { id: '9', name: '한소희' },
      { id: '10', name: '김민준' },
      { id: '11', name: '박서연' },
      { id: '12', name: '이준호' },
    ],
    selectedStudentId: '',
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    panelPos: { x: 0, y: 0 },
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

export const DifferentPositions: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '800px',
        height: '600px',
        background: '#2a2a2a',
      }}
    >
      <StudentPanel
        students={mockStudents}
        selectedStudentId="1"
        onStudentSelect={studentId =>
          console.log('Left panel - Student selected:', studentId)
        }
        panelPos={{ x: 50, y: 50 }}
        onPanelMove={pos => console.log('Left panel moved to:', pos)}
      />
      <StudentPanel
        students={mockStudents.slice(0, 3)}
        selectedStudentId="2"
        onStudentSelect={studentId =>
          console.log('Right panel - Student selected:', studentId)
        }
        panelPos={{ x: 500, y: 100 }}
        onPanelMove={pos => console.log('Right panel moved to:', pos)}
      />
    </div>
  ),
};
