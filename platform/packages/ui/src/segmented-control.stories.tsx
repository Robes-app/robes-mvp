import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'today', label: 'Style today' },
  { value: 'trip', label: 'Plan a trip' },
  { value: 'piece', label: 'Style a piece' },
] as const;

function Demo() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('today');
  return (
    <SegmentedControl
      label="What would you like"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

const meta = { title: 'Primitives/SegmentedControl', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
