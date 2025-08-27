import type { Meta, StoryObj } from '@storybook/react-vite';
import StudentPanel from '../components/organisms/StudentPanel';

const meta: Meta<typeof StudentPanel> = {
  title: 'Organisms/StudentPanel',
  component: StudentPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedStudentId: {
      control: { type: 'text' },
    },
    onStudentSelect: { action: 'studentSelected' },
    onPanelMove: { action: 'panelMoved' },
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

// 기본 StudentPanel
export const Default: Story = {
  args: {
    students: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
      { id: '5', name: 'David Brown', email: 'david@example.com' },
    ],
    selectedStudentId: '1',
    panelPos: { x: 100, y: 100 },
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

// 선택된 학생이 있는 패널
export const WithSelectedStudent: Story = {
  args: {
    students: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    ],
    selectedStudentId: '2',
    panelPos: { x: 200, y: 150 },
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

// 빈 학생 목록
export const EmptyStudents: Story = {
  args: {
    students: [],
    selectedStudentId: '',
    panelPos: { x: 300, y: 200 },
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

// 많은 학생들
export const ManyStudents: Story = {
  args: {
    students: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
      { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
      { id: '5', name: 'David Brown', email: 'david@example.com' },
      { id: '6', name: 'Emily Davis', email: 'emily@example.com' },
      { id: '7', name: 'Chris Miller', email: 'chris@example.com' },
      { id: '8', name: 'Lisa Garcia', email: 'lisa@example.com' },
      { id: '9', name: 'Tom Anderson', email: 'tom@example.com' },
      { id: '10', name: 'Amy Taylor', email: 'amy@example.com' },
      { id: '11', name: 'Kevin Martinez', email: 'kevin@example.com' },
      { id: '12', name: 'Rachel Lee', email: 'rachel@example.com' },
    ],
    selectedStudentId: '5',
    panelPos: { x: 400, y: 100 },
    onStudentSelect: studentId => console.log('Student selected:', studentId),
    onPanelMove: pos => console.log('Panel moved to:', pos),
  },
};

// 다양한 위치의 패널들
export const MultiplePositions: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 왼쪽 상단 */}
      <StudentPanel
        students={[
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        ]}
        selectedStudentId="1"
        panelPos={{ x: 50, y: 50 }}
        onStudentSelect={studentId =>
          console.log('Left top - Student selected:', studentId)
        }
        onPanelMove={pos => console.log('Left top - Panel moved to:', pos)}
      />

      {/* 오른쪽 상단 */}
      <StudentPanel
        students={[
          { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
          { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com' },
        ]}
        selectedStudentId="3"
        panelPos={{ x: 600, y: 50 }}
        onStudentSelect={studentId =>
          console.log('Right top - Student selected:', studentId)
        }
        onPanelMove={pos => console.log('Right top - Panel moved to:', pos)}
      />

      {/* 왼쪽 하단 */}
      <StudentPanel
        students={[
          { id: '5', name: 'David Brown', email: 'david@example.com' },
          { id: '6', name: 'Emily Davis', email: 'emily@example.com' },
        ]}
        selectedStudentId="5"
        panelPos={{ x: 50, y: 400 }}
        onStudentSelect={studentId =>
          console.log('Left bottom - Student selected:', studentId)
        }
        onPanelMove={pos => console.log('Left bottom - Panel moved to:', pos)}
      />

      {/* 오른쪽 하단 */}
      <StudentPanel
        students={[
          { id: '7', name: 'Chris Miller', email: 'chris@example.com' },
          { id: '8', name: 'Lisa Garcia', email: 'lisa@example.com' },
        ]}
        selectedStudentId="7"
        panelPos={{ x: 600, y: 400 }}
        onStudentSelect={studentId =>
          console.log('Right bottom - Student selected:', studentId)
        }
        onPanelMove={pos => console.log('Right bottom - Panel moved to:', pos)}
      />
    </div>
  ),
};

// 드래그 앤 드롭 데모
export const DragAndDropDemo: Story = {
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
        드래그 앤 드롭 데모
      </div>

      {/* 드래그 가능한 아이템들 */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50px',
          width: '120px',
          height: '40px',
          background: 'var(--color-blue-500)',
          color: 'white',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          fontSize: '12px',
          zIndex: 10,
        }}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData('text/plain', 'dragged-student');
          console.log('Student drag started');
        }}
      >
        학생 드래그
      </div>

      {/* StudentPanel */}
      <StudentPanel
        students={[
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
          { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
        ]}
        selectedStudentId="1"
        panelPos={{ x: 300, y: 100 }}
        onStudentSelect={studentId =>
          console.log('Student selected:', studentId)
        }
        onPanelMove={pos => console.log('Panel moved to:', pos)}
      />

      {/* 드롭 영역 */}
      <div
        style={{
          position: 'absolute',
          top: '300px',
          left: '300px',
          width: '200px',
          height: '100px',
          border: '2px dashed var(--color-gray-400)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-gray-50)',
          color: 'var(--color-gray-600)',
          fontSize: '14px',
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const data = e.dataTransfer.getData('text/plain');
          console.log('Dropped:', data);
        }}
      >
        드롭 영역
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
        복합 StudentPanel 시나리오
      </div>

      {/* 수학 과목 학생들 */}
      <div style={{ position: 'absolute', top: '60px', left: '10px' }}>
        <StudentPanel
          students={[
            { id: 'math1', name: 'John Doe', email: 'john@example.com' },
            { id: 'math2', name: 'Jane Smith', email: 'jane@example.com' },
            { id: 'math3', name: 'Mike Johnson', email: 'mike@example.com' },
          ]}
          selectedStudentId="math1"
          panelPos={{ x: 0, y: 0 }}
          onStudentSelect={studentId =>
            console.log('Math student selected:', studentId)
          }
          onPanelMove={pos => console.log('Math panel moved to:', pos)}
        />
      </div>

      {/* 과학 과목 학생들 */}
      <div style={{ position: 'absolute', top: '60px', left: '350px' }}>
        <StudentPanel
          students={[
            {
              id: 'science1',
              name: 'Sarah Wilson',
              email: 'sarah@example.com',
            },
            { id: 'science2', name: 'David Brown', email: 'david@example.com' },
            { id: 'science3', name: 'Emily Davis', email: 'emily@example.com' },
            {
              id: 'science4',
              name: 'Chris Miller',
              email: 'chris@example.com',
            },
          ]}
          selectedStudentId="science2"
          panelPos={{ x: 0, y: 0 }}
          onStudentSelect={studentId =>
            console.log('Science student selected:', studentId)
          }
          onPanelMove={pos => console.log('Science panel moved to:', pos)}
        />
      </div>

      {/* 언어 과목 학생들 */}
      <div style={{ position: 'absolute', top: '60px', left: '700px' }}>
        <StudentPanel
          students={[
            { id: 'lang1', name: 'Lisa Garcia', email: 'lisa@example.com' },
            { id: 'lang2', name: 'Tom Anderson', email: 'tom@example.com' },
            { id: 'lang3', name: 'Amy Taylor', email: 'amy@example.com' },
          ]}
          selectedStudentId="lang3"
          panelPos={{ x: 0, y: 0 }}
          onStudentSelect={studentId =>
            console.log('Language student selected:', studentId)
          }
          onPanelMove={pos => console.log('Language panel moved to:', pos)}
        />
      </div>

      {/* 빈 과목 */}
      <div style={{ position: 'absolute', top: '60px', left: '1050px' }}>
        <StudentPanel
          students={[]}
          selectedStudentId=""
          panelPos={{ x: 0, y: 0 }}
          onStudentSelect={studentId =>
            console.log('Empty subject - Student selected:', studentId)
          }
          onPanelMove={pos =>
            console.log('Empty subject - Panel moved to:', pos)
          }
        />
      </div>
    </div>
  ),
};
