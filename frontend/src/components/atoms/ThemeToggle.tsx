import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text' | 'both';
}

export default function ThemeToggle({
  size = 'medium',
  variant = 'both',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeStyles = {
    small: { padding: '6px 8px', fontSize: '12px' },
    medium: { padding: '8px 12px', fontSize: '14px' },
    large: { padding: '12px 16px', fontSize: '16px' },
  };

  const iconStyles = {
    small: { fontSize: '14px' },
    medium: { fontSize: '16px' },
    large: { fontSize: '20px' },
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      style={{
        ...sizeStyles[size],
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: 'var(--color-gray-200)',
        color: 'var(--color-gray-800)',
      }}
      title={`현재 테마: ${theme === 'dark' ? '다크' : '라이트'}`}
    >
      {variant !== 'text' && (
        <span style={iconStyles[size]}>{theme === 'dark' ? '🌙' : '☀️'}</span>
      )}
      {variant !== 'icon' && (
        <span>{theme === 'dark' ? '라이트' : '다크'}</span>
      )}
    </button>
  );
}
