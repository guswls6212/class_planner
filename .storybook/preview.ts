import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0b0d12" },
        { name: "light", value: "#ffffff" },
      ],
    },
    a11y: {
      test: "todo",
    },
    /**
     * Viewport 프리셋 — 모달/반응형 컴포넌트의 모바일/태블릿/데스크탑 시각 검증.
     * Storybook 10은 별도 addon 없이 parameters.viewport로 등록.
     * 사이드바 toolbar에서 viewport 토글 가능.
     */
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile (375×667)",
          styles: { width: "375px", height: "667px" },
          type: "mobile",
        },
        mobileLarge: {
          name: "Mobile Large (414×896)",
          styles: { width: "414px", height: "896px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet (768×1024)",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop (1440×900)",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
      },
    },
  },
};

export default preview;
