import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Chip, Pill } from './pill';

const FILTERS = ['Knitwear', 'Tailoring', 'Shoes', 'Bags'];

function Filters() {
  const [selected, setSelected] = useState<string[]>(['Tailoring']);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Pill
            key={f}
            selected={selected.includes(f)}
            onClick={() =>
              setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]))
            }
          >
            {f}
          </Pill>
        ))}
      </div>
      <div className="flex gap-2">
        <Chip>In your wardrobe</Chip>
        <Chip>Key piece</Chip>
      </div>
    </div>
  );
}

const meta = { title: 'Primitives/Pill', component: Filters } satisfies Meta<typeof Filters>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
