import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { CommandBar } from './command-bar';

const noop = (): void => undefined;
const COMMANDS = [
  { id: 'today', label: 'Today', group: 'Go to', onSelect: noop },
  { id: 'wardrobe', label: 'Wardrobe', group: 'Go to', onSelect: noop },
  { id: 'looks', label: 'Looks', group: 'Go to', onSelect: noop },
  { id: 'photo', label: 'Photograph pieces', group: 'Create', onSelect: noop },
  { id: 'style', label: 'Style a piece', group: 'Create', onSelect: noop },
];

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <CommandBar
      open={open}
      onOpenChange={setOpen}
      commands={COMMANDS}
      label="Search Robes"
      placeholder="Go to, or ask Robes…"
      emptyLabel="No matches."
    />
  );
}

const meta = { title: 'Primitives/CommandBar', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
