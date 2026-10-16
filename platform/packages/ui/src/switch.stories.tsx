import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Switch } from './switch';

function Demo() {
  const [on, setOn] = useState(true);
  return (
    <Switch label="When your looks are ready" hint="A quiet note" checked={on} onChange={setOn} />
  );
}

const meta = { title: 'Primitives/Switch', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
