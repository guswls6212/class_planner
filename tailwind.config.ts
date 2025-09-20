import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 기존 CSS 변수를 TailwindCSS 색상으로 변환
        primary: {
          DEFAULT: "#3b82f6",
          light: "#dbeafe",
          dark: "#2563eb",
        },
        secondary: {
          DEFAULT: "#6b7280",
          light: "#9ca3af",
          dark: "#4b5563",
        },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#dc2626",

        // 테마별 색상
        bg: {
          primary: "var(--color-bg-primary)",
          secondary: "var(--color-bg-secondary)",
          tertiary: "var(--color-bg-tertiary)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          light: "var(--color-border-light)",
          grid: "var(--color-border-grid)",
          "grid-light": "var(--color-border-grid-light)",
          "grid-lighter": "var(--color-border-grid-lighter)",
        },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "300ms",
      },
      zIndex: {
        "10": "10",
        "50": "50",
        "1000": "1000",
        "20000": "20000",
        "20001": "20001",
        "20002": "20002",
      },
    },
  },
  plugins: [],
};

export default config;
