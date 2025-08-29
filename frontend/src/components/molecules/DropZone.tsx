import React, { useState } from 'react';

interface DropZoneProps {
  weekday: number;
  time: string;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  style?: React.CSSProperties;
}

export default function DropZone({
  weekday,
  time,
  onDrop,
  onEmptySpaceClick,
  style,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    console.log('🆕 DropZone handleDrop 호출됨:', { weekday, time });
    console.log('🆕 dataTransfer types:', e.dataTransfer.types);

    const enrollmentId = e.dataTransfer.getData('text/plain');
    console.log('🆕 가져온 enrollmentId:', enrollmentId);

    if (enrollmentId) {
      console.log('🆕 onDrop 호출:', { weekday, time, enrollmentId });
      onDrop(weekday, time, enrollmentId);
    } else {
      console.log('🆕 enrollmentId가 없음');
    }
  };

  const handleClick = () => {
    onEmptySpaceClick(weekday, time);
  };

  const styles = {
    ...style,
    border: isDragOver
      ? '2px dashed var(--color-primary)'
      : '1px dashed transparent',
    backgroundColor: isDragOver
      ? 'rgba(var(--color-primary-rgb), 0.1)'
      : style?.backgroundColor || 'transparent',
    cursor: 'pointer',
    pointerEvents: 'auto' as const, // 클릭 이벤트가 제대로 작동하도록 설정
  };

  return (
    <div
      style={styles}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid={`dropzone-${weekday}-${time}`}
    />
  );
}
