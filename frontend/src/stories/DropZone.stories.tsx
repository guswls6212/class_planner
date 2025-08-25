import type { Meta, StoryObj } from '@storybook/react-vite';
import DropZone from '../components/molecules/DropZone';

const meta: Meta<typeof DropZone> = {
  title: 'Molecules/DropZone',
  component: DropZone,
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
    height: {
      control: { type: 'range', min: 40, max: 200, step: 10 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    hourIdx: 0,
    height: 40,
    onDrop: e => console.log('Drop event:', e),
    onDragEnter: e => console.log('Drag enter event:', e),
    onDragLeave: e => console.log('Drag leave event:', e),
    onDragOver: e => console.log('Drag over event:', e),
  },
};

export const TallDropZone: Story = {
  args: {
    hourIdx: 1,
    height: 120,
    onDrop: e => console.log('Drop event:', e),
    onDragEnter: e => console.log('Drag enter event:', e),
    onDragLeave: e => console.log('Drag leave event:', e),
    onDragOver: e => console.log('Drag over event:', e),
  },
};

export const MultipleDropZones: Story = {
  render: () => (
    <div
      style={{
        position: 'relative',
        width: '600px',
        height: '200px',
        background: '#2a2a2a',
      }}
    >
      <DropZone
        hourIdx={0}
        height={40}
        onDrop={e => console.log('Drop on 9:00:', e)}
        onDragEnter={e => console.log('Drag enter 9:00:', e)}
        onDragLeave={e => console.log('Drag leave 9:00:', e)}
        onDragOver={e => console.log('Drag over 9:00:', e)}
      />
      <DropZone
        hourIdx={1}
        height={80}
        onDrop={e => console.log('Drop on 10:00:', e)}
        onDragEnter={e => console.log('Drag enter 10:00:', e)}
        onDragLeave={e => console.log('Drag leave 10:00:', e)}
        onDragOver={e => console.log('Drag over 10:00:', e)}
      />
      <DropZone
        hourIdx={2}
        height={120}
        onDrop={e => console.log('Drop on 11:00:', e)}
        onDragEnter={e => console.log('Drag enter 11:00:', e)}
        onDragLeave={e => console.log('Drag leave 11:00:', e)}
        onDragOver={e => console.log('Drag over 11:00:', e)}
      />
      <DropZone
        hourIdx={3}
        height={160}
        onDrop={e => console.log('Drop on 12:00:', e)}
        onDragEnter={e => console.log('Drag enter 12:00:', e)}
        onDragLeave={e => console.log('Drag leave 12:00:', e)}
        onDragOver={e => console.log('Drag over 12:00:', e)}
      />
    </div>
  ),
};

export const WithGridLines: Story = {
  args: {
    height: 40,
  },

  render: () => (
    <div
      style={{
        position: 'relative',
        width: '600px',
        height: '200px',
        background: '#2a2a2a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '120px 40px',
        }}
      />
      <DropZone
        hourIdx={0}
        height={40}
        onDrop={e => console.log('Drop event:', e)}
        onDragEnter={e => console.log('Drag enter event:', e)}
        onDragLeave={e => console.log('Drag leave event:', e)}
        onDragOver={e => console.log('Drag over event:', e)}
      />
      <DropZone
        hourIdx={1}
        height={80}
        onDrop={e => console.log('Drop event:', e)}
        onDragEnter={e => console.log('Drag enter event:', e)}
        onDragLeave={e => console.log('Drag leave event:', e)}
        onDragOver={e => console.log('Drag over event:', e)}
      />
      <DropZone
        hourIdx={2}
        height={120}
        onDrop={e => console.log('Drop event:', e)}
        onDragEnter={e => console.log('Drag enter event:', e)}
        onDragLeave={e => console.log('Drag leave event:', e)}
        onDragOver={e => console.log('Drag over event:', e)}
      />
      <DropZone
        hourIdx={3}
        height={160}
        onDrop={e => console.log('Drop event:', e)}
        onDragEnter={e => console.log('Drag enter event:', e)}
        onDragLeave={e => console.log('Drag leave event:', e)}
        onDragOver={e => console.log('Drag over event:', e)}
      />
    </div>
  ),
};
