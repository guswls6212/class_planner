import type { Meta, StoryObj } from '@storybook/react-vite';
import DropZone from '../components/molecules/DropZone';

const meta: Meta<typeof DropZone> = {
  title: 'Molecules/DropZone',
  component: DropZone,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    hourIdx: {
      control: { type: 'number', min: 0, max: 24 },
    },
    height: {
      control: { type: 'number', min: 50, max: 500 },
    },
    onDrop: { action: 'dropped' },
    onDragEnter: { action: 'dragEnter' },
    onDragLeave: { action: 'dragLeave' },
    onDragOver: { action: 'dragOver' },
  },
  decorators: [
    Story => (
      <div
        style={{
          position: 'relative',
          width: '800px',
          height: '400px',
          background: 'var(--color-gray-50)',
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

// 기본 DropZone
export const Default: Story = {
  args: {
    hourIdx: 0,
    height: 200,
    onDrop: e => console.log('Drop event:', e),
    onDragEnter: e => console.log('Drag enter event:', e),
    onDragLeave: e => console.log('Drag leave event:', e),
    onDragOver: e => console.log('Drag over event:', e),
  },
};

// 다양한 시간대
export const TimeSlots: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '800px', height: '300px' }}>
      {/* 9:00 */}
      <DropZone
        hourIdx={0}
        height={200}
        onDrop={e => console.log('9:00 drop:', e)}
        onDragEnter={e => console.log('9:00 drag enter:', e)}
        onDragLeave={() => console.log('9:00 drag leave')}
        onDragOver={e => console.log('9:00 drag over:', e)}
      />

      {/* 10:00 */}
      <DropZone
        hourIdx={1}
        height={200}
        onDrop={e => console.log('10:00 drop:', e)}
        onDragEnter={e => console.log('10:00 drag enter:', e)}
        onDragLeave={() => console.log('10:00 drag leave')}
        onDragOver={e => console.log('10:00 drag over:', e)}
      />

      {/* 11:00 */}
      <DropZone
        hourIdx={2}
        height={200}
        onDrop={e => console.log('11:00 drop:', e)}
        onDragEnter={e => console.log('11:00 drag enter:', e)}
        onDragLeave={() => console.log('11:00 drag leave')}
        onDragOver={e => console.log('11:00 drag over:', e)}
      />

      {/* 12:00 */}
      <DropZone
        hourIdx={3}
        height={200}
        onDrop={e => console.log('12:00 drop:', e)}
        onDragEnter={e => console.log('12:00 drag enter:', e)}
        onDragLeave={() => console.log('12:00 drag leave')}
        onDragOver={e => console.log('12:00 drag over:', e)}
      />
    </div>
  ),
};

// 다양한 높이
export const Heights: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '800px', height: '400px' }}>
      {/* 낮은 높이 */}
      <DropZone
        hourIdx={0}
        height={100}
        onDrop={e => console.log('Low height drop:', e)}
        onDragEnter={e => console.log('Low height drag enter:', e)}
        onDragLeave={() => console.log('Low height drag leave')}
        onDragOver={e => console.log('Low height drag over:', e)}
      />

      {/* 중간 높이 */}
      <DropZone
        hourIdx={1}
        height={200}
        onDrop={e => console.log('Medium height drop:', e)}
        onDragEnter={e => console.log('Medium height drag enter:', e)}
        onDragLeave={() => console.log('Medium height drag leave')}
        onDragOver={e => console.log('Medium height drag over:', e)}
      />

      {/* 높은 높이 */}
      <DropZone
        hourIdx={2}
        height={300}
        onDrop={e => console.log('High height drop:', e)}
        onDragEnter={e => console.log('High height drag enter:', e)}
        onDragLeave={() => console.log('High height drag leave')}
        onDragOver={e => console.log('High height drag over:', e)}
      />

      {/* 매우 높은 높이 */}
      <DropZone
        hourIdx={3}
        height={400}
        onDrop={e => console.log('Very high height drop:', e)}
        onDragEnter={e => console.log('Very high height drag enter:', e)}
        onDragLeave={() => console.log('Very high height drag leave')}
        onDragOver={e => console.log('Very high height drag over:', e)}
      />
    </div>
  ),
};

// 전체 시간표 시뮬레이션
export const FullSchedule: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '1200px', height: '500px' }}>
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
        전체 시간표 (9:00-18:00)
      </div>

      {/* 9:00-18:00 시간대 */}
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{ position: 'absolute', top: '40px', left: `${i * 120}px` }}
        >
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-gray-500)',
              textAlign: 'center',
              marginBottom: '5px',
            }}
          >
            {9 + i}:00
          </div>
          <DropZone
            hourIdx={i}
            height={400}
            onDrop={e => console.log(`${9 + i}:00 drop:`, e)}
            onDragEnter={e => console.log(`${9 + i}:00 drag enter:`, e)}
            onDragLeave={() => console.log(`${9 + i}:00 drag leave`)}
            onDragOver={e => console.log(`${9 + i}:00 drag over:`, e)}
          />
        </div>
      ))}
    </div>
  ),
};

// 드래그 앤 드롭 데모
export const DragAndDropDemo: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '800px', height: '300px' }}>
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
        드래그 앤 드롭 데모
      </div>

      {/* 드래그 가능한 아이템 */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50px',
          width: '100px',
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
          e.dataTransfer.setData('text/plain', 'dragged-item');
          console.log('Drag started');
        }}
      >
        드래그하세요
      </div>

      {/* DropZone들 */}
      <DropZone
        hourIdx={0}
        height={200}
        onDrop={e => {
          e.preventDefault();
          console.log('Item dropped in 9:00 slot');
        }}
        onDragEnter={e => {
          e.preventDefault();
          console.log('Drag entered 9:00 slot');
        }}
        onDragLeave={() => {
          console.log('Drag left 9:00 slot');
        }}
        onDragOver={e => {
          e.preventDefault();
          console.log('Drag over 9:00 slot');
        }}
      />

      <DropZone
        hourIdx={1}
        height={200}
        onDrop={e => {
          e.preventDefault();
          console.log('Item dropped in 10:00 slot');
        }}
        onDragEnter={e => {
          e.preventDefault();
          console.log('Drag entered 10:00 slot');
        }}
        onDragLeave={() => {
          console.log('Drag left 10:00 slot');
        }}
        onDragOver={e => {
          e.preventDefault();
          console.log('Drag over 10:00 slot');
        }}
      />

      <DropZone
        hourIdx={2}
        height={200}
        onDrop={e => {
          e.preventDefault();
          console.log('Item dropped in 11:00 slot');
        }}
        onDragEnter={e => {
          e.preventDefault();
          console.log('Drag entered 11:00 slot');
        }}
        onDragLeave={() => {
          console.log('Drag left 11:00 slot');
        }}
        onDragOver={e => {
          e.preventDefault();
          console.log('Drag over 11:00 slot');
        }}
      />
    </div>
  ),
};

// 반응형 높이
export const ResponsiveHeights: Story = {
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
        반응형 높이 데모
      </div>

      {/* 시간대별로 다른 높이 */}
      {Array.from({ length: 6 }, (_, i) => (
        <DropZone
          key={i}
          hourIdx={i}
          height={100 + i * 50} // 100, 150, 200, 250, 300, 350
          onDrop={e =>
            console.log(`${9 + i}:00 drop (height: ${100 + i * 50}):`, e)
          }
          onDragEnter={e => console.log(`${9 + i}:00 drag enter:`, e)}
          onDragLeave={e => console.log(`${9 + i}:00 drag leave:`, e)}
          onDragOver={e => console.log(`${9 + i}:00 drag over:`, e)}
        />
      ))}
    </div>
  ),
};

// 복합 시나리오
export const Complex: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '1200px', height: '600px' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          fontSize: '16px',
          color: 'var(--color-gray-800)',
          fontWeight: 'bold',
        }}
      >
        복합 DropZone 시나리오
      </div>

      {/* 오전 시간대 */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '10px',
          fontSize: '14px',
          color: 'var(--color-gray-600)',
          fontWeight: 'bold',
        }}
      >
        오전 (9:00-12:00)
      </div>

      {Array.from({ length: 4 }, (_, i) => (
        <DropZone
          key={`morning-${i}`}
          hourIdx={i}
          height={120}
          onDrop={e => console.log(`오전 ${9 + i}:00 drop:`, e)}
          onDragEnter={e => console.log(`오전 ${9 + i}:00 drag enter:`, e)}
          onDragLeave={e => console.log(`오전 ${9 + i}:00 drag leave:`, e)}
          onDragOver={e => console.log(`오전 ${9 + i}:00 drag over:`, e)}
        />
      ))}

      {/* 오후 시간대 */}
      <div
        style={{
          position: 'absolute',
          top: '200px',
          left: '10px',
          fontSize: '14px',
          color: 'var(--color-gray-600)',
          fontWeight: 'bold',
        }}
      >
        오후 (13:00-18:00)
      </div>

      {Array.from({ length: 6 }, (_, i) => (
        <DropZone
          key={`afternoon-${i}`}
          hourIdx={i + 4}
          height={150}
          onDrop={e => console.log(`오후 ${13 + i}:00 drop:`, e)}
          onDragEnter={e => console.log(`오후 ${13 + i}:00 drag enter:`, e)}
          onDragLeave={e => console.log(`오후 ${13 + i}:00 drag leave:`, e)}
          onDragOver={e => console.log(`오후 ${13 + i}:00 drag over:`, e)}
        />
      ))}

      {/* 저녁 시간대 */}
      <div
        style={{
          position: 'absolute',
          top: '400px',
          left: '10px',
          fontSize: '14px',
          color: 'var(--color-gray-600)',
          fontWeight: 'bold',
        }}
      >
        저녁 (19:00-21:00)
      </div>

      {Array.from({ length: 3 }, (_, i) => (
        <DropZone
          key={`evening-${i}`}
          hourIdx={i + 10}
          height={100}
          onDrop={e => console.log(`저녁 ${19 + i}:00 drop:`, e)}
          onDragEnter={e => console.log(`저녁 ${19 + i}:00 drag enter:`, e)}
          onDragLeave={e => console.log(`저녁 ${19 + i}:00 drag leave:`, e)}
          onDragOver={e => console.log(`저녁 ${19 + i}:00 drag over:`, e)}
        />
      ))}
    </div>
  ),
};
