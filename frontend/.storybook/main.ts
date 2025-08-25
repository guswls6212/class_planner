import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: false, // Disable react-docgen to avoid parsing issues
  },
  viteFinal: async config => {
    // Ensure proper TypeScript handling
    if (config.esbuild) {
      config.esbuild = {
        ...config.esbuild,
        target: 'es2020',
        jsx: 'automatic',
      };
    }

    return config;
  },
};

export default config;
