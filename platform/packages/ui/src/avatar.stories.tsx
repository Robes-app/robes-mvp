import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './avatar';

function Sizes() {
  return (
    <div className="flex items-center gap-4">
      <Avatar name="Ann Byrne" size="sm" />
      <Avatar name="Ann Byrne" />
      <Avatar name="Ann Byrne" size="lg" />
      <Avatar name="Ann Byrne" src="/story-missing.webp" />
    </div>
  );
}

const meta = { title: 'Primitives/Avatar', component: Sizes } satisfies Meta<typeof Sizes>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
