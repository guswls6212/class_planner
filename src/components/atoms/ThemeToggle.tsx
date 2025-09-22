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

export default function ThemeToggle({
  size = "medium",
  variant = "both",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeStyles = getSizeStyles(size);
  const iconStyles = getIconStyles(size);

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      style={{
        ...sizeStyles,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: "var(--color-gray-200)",
        color: "var(--color-gray-800)",
      }}
      title={getThemeTitle(theme)}
    >
      {shouldShowIcon(variant) && (
        <span style={iconStyles}>{getThemeIcon(theme)}</span>
      )}
      {shouldShowText(variant) && <span>{getThemeText(theme)}</span>}
    </button>
  );
}
