import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    watch: false, // Watch 모드 비활성화 (자동 종료)
    // PR #428 sub-fix: vitest worker hang (CI 27-52분 timeout).
    // threads pool 누수 → forks 격리. 각 spec 자체 process — worker leak 차단.
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1,
      },
    },
    exclude: [
      "node_modules/",
      "dist/",
      ".next/",
      "tests/e2e/**", // E2E 테스트 제외
      ".worktrees/**", // 중첩 worktree 제외
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/dist/**",
        "**/.next/**",
        "**/tests/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@application": path.resolve(__dirname, "./src/application"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
});
