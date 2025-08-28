import React, { useState } from 'react';

interface DropZoneProps {
  hourIdx: number;
  height: number;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const getDropZoneStyles = (
  hourIdx: number,
  height: number
): React.CSSProperties => {
  return {
    position: 'absolute',
    left: hourIdx * 120,
    top: 0,
    width: 120,
    height,
    border: '1px dashed transparent',
    transition: 'border-color 0.2s',
    zIndex: 5,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const calculateDropZoneLeft = (hourIdx: number): number => {
  return hourIdx * 120;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getDropZoneWidth = (): number => {
  return 120;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getDropZoneZIndex = (): number => {
  return 5;
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateDropZoneProps = (
  hourIdx: number,
  height: number
): boolean => {
  return hourIdx >= 0 && height > 0;
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowDropZone = (height: number): boolean => {
  return height > 0;
};

// eslint-disable-next-line react-refresh/only-export-components
export const getDropZoneBorderStyle = (): string => {
  return '1px dashed transparent';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getDropZoneTransition = (): string => {
  return 'border-color 0.2s';
};

export default function DropZone({
  hourIdx,
  height,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const styles = {
    ...getDropZoneStyles(hourIdx, height),
    border: isDragOver
      ? '2px dashed var(--color-primary)'
      : '1px dashed transparent',
    backgroundColor: isDragOver
      ? 'rgba(var(--color-primary-rgb), 0.1)'
      : 'transparent',
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragEnter(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e);
  };

  return (
    <div
      data-testid="drop-zone"
      style={styles}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    />
  );
}
