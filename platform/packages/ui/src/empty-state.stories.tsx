import { today } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { EmptyState } from './empty-state';

function Demo() {
  return (
    <EmptyState
      icon={<Icon name="wardrobe" size={24} />}
      title="Left free."
      body={today.nextStep}
      action={<Button>Add a piece</Button>}
    />
  );
}

const meta = { title: 'Primitives/EmptyState', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
