import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs-vite';
import './storybook.css';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
    controls: { expanded: true },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
};

export default preview;
