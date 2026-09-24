import { nav, ui } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IconButton } from './icon-button';

const meta = {
  title: 'Primitives/IconButton',
  component: IconButton,
  args: { icon: 'close', label: ui.close },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outlined: Story = { args: { outlined: true, icon: 'plus', label: nav.create } };
export const Dark: Story = { args: { outlined: true }, globals: { theme: 'dark' } };
