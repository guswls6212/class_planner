interface DropZoneProps {
  hourIdx: number;
  height: number;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export default function DropZone({
  hourIdx,
  height,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
}: DropZoneProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: hourIdx * 120,
        top: 0,
        width: 120,
        height,
        border: '1px dashed transparent',
        transition: 'border-color 0.2s',
        zIndex: 5,
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    />
  );
}
