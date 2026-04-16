import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  size?: "small" | "medium" | "large";
  variant?: "icon" | "text" | "both";
}

// 유틸리티 함수들 (테스트 가능)

export const getSizeStyles = (size: string) => {
  const sizeStyles = {
    small: { padding: "6px 8px", fontSize: "12px" },
    medium: { padding: "8px 12px", fontSize: "14px" },
    large: { padding: "12px 16px", fontSize: "16px" },
  };
  return sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.medium;
};


export const getIconStyles = (size: string) => {
  const iconStyles = {
    small: { fontSize: "14px" },
    medium: { fontSize: "16px" },
    large: { fontSize: "20px" },
  };
  return iconStyles[size as keyof typeof iconStyles] || iconStyles.medium;
};


export const shouldShowIcon = (variant: string): boolean => {
  return variant !== "text";
};


export const shouldShowText = (variant: string): boolean => {
  return variant !== "icon";
};


export const getThemeIcon = (theme: string): string => {
  return theme === "dark" ? "🌙" : "☀️";
};


export const getThemeText = (theme: string): string => {
  return theme === "dark" ? "라이트" : "다크";
};


export const getThemeTitle = (theme: string): string => {
  return `현재 테마: ${theme === "dark" ? "다크" : "라이트"}`;
};


export const validateThemeToggleSize = (size: string): boolean => {
  const validSizes = ["small", "medium", "large"];
  return validSizes.includes(size);
};


export const validateThemeToggleVariant = (variant: string): boolean => {
  const validVariants = ["icon", "text", "both"];
  return validVariants.includes(variant);
};

const SIZE_CLASSES: Record<string, string> = {
  small: "px-2 py-1.5 text-xs",
  medium: "px-3 py-2 text-sm",
  large: "px-4 py-3 text-base",
};

const ICON_SIZE_CLASSES: Record<string, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-xl",
};

export default function ThemeToggle({
  size = "medium",
  variant = "both",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.medium;
  const iconSizeClass = ICON_SIZE_CLASSES[size] ?? ICON_SIZE_CLASSES.medium;

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle inline-flex items-center gap-1.5 rounded-[6px] border-none cursor-pointer transition-all duration-200 bg-gray-200 text-gray-800 ${sizeClass}`}
      title={getThemeTitle(theme)}
    >
      {shouldShowIcon(variant) && (
        <span className={iconSizeClass}>{getThemeIcon(theme)}</span>
      )}
      {shouldShowText(variant) && <span>{getThemeText(theme)}</span>}
    </button>
  );
}
