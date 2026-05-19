import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
  js.configs.recommended,
  // jsx-a11y: recommended rules at warn level (errors promoted to warn so legacy issues
  // don't block CI; will escalate to error in Phase 3 after visual redesign)
  {
    files: ["**/*.{tsx,jsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(
          jsxA11y.flatConfigs?.recommended?.rules ??
            jsxA11y.configs.recommended.rules
        ).map(([key, val]) => {
          // Downgrade error → warn; handles both string ("error") and array (["error", opts]) forms
          if (Array.isArray(val)) {
            const [sev, ...rest] = val;
            return [key, [sev === "error" || sev === 2 ? "warn" : sev, ...rest]];
          }
          return [key, val === "error" || val === 2 ? "warn" : val];
        })
      ),
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        getComputedStyle: "readonly",
        crypto: "readonly",
        performance: "readonly",
        navigator: "readonly",

        // Fetch API
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",

        // Node.js globals
        process: "readonly",
        global: "readonly",
        __dirname: "readonly",
        NodeJS: "readonly",

        // React globals
        React: "readonly",

        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "error",
      "prefer-const": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-escape": "warn",
      // ADR-012: fire-and-forget 은 명시적 `void` prefix 또는 fireAndForget() 헬퍼로만.
      // 누락된 await 가 race window 의 root cause (PR #319/#320). PR review 단계에서 잡히도록
      // type-aware lint 적용. Phase 1: warn 으로 도입 (37개 기존 위반은 backlog 으로). Phase 2:
      // 위반 fix 완료 후 "error" 로 승격 (jsx-a11y warn→error 점진 패턴 미러). 신규 코드에는 review
      // 시점에 즉시 인지 가능.
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        getComputedStyle: "readonly",
        crypto: "readonly",
        performance: "readonly",
        navigator: "readonly",

        // Fetch API
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",

        // Node.js globals
        process: "readonly",
        global: "readonly",
        __dirname: "readonly",
        NodeJS: "readonly",

        // React globals
        React: "readonly",

        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "error",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
    },
  },
  {
    // logger.ts 내부에서만 console.* 사용 허용 (stdout 최종 출력 지점)
    // 테스트 파일은 console을 mock/restore하므로 허용
    files: [
      "src/lib/logger.ts",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: { "no-console": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".storybook/**",
      "storybook-static/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tests/e2e/**",
      "scripts/**",
      "verify-*.mjs",
      ".worktrees/**",
    ],
  },
];

export default eslintConfig;
