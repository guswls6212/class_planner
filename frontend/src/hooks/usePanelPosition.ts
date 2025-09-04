import { useEffect, useState } from 'react';
import type { PanelPosition } from '../types/scheduleTypes';

const PANEL_POSITION_KEY = 'ui:studentsPanelPos';
const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 400;

export const usePanelPosition = () => {
  const [position, setPosition] = useState<PanelPosition>({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // 초기 위치 설정 (화면 중앙 또는 저장된 위치)
  useEffect(() => {
    const savedPos = localStorage.getItem(PANEL_POSITION_KEY);

    if (savedPos) {
      try {
        const parsedPos = JSON.parse(savedPos) as PanelPosition;
        setPosition(parsedPos);
      } catch (error) {
        console.warn('저장된 패널 위치를 파싱할 수 없습니다:', error);
        setDefaultPosition();
      }
    } else {
      setDefaultPosition();
    }

    setIsInitialized(true);
  }, []);

  // 기본 위치 설정 (화면 중앙)
  const setDefaultPosition = () => {
    const centerX = Math.max(0, (window.innerWidth - PANEL_WIDTH) / 2);
    const centerY = Math.max(0, (window.innerHeight - PANEL_HEIGHT) / 2);
    setPosition({ x: centerX, y: centerY });
  };

  // 위치 업데이트 및 localStorage 저장
  const updatePosition = (newPosition: PanelPosition) => {
    setPosition(newPosition);
    localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(newPosition));
  };

  return {
    position,
    isInitialized,
    updatePosition,
  };
};
