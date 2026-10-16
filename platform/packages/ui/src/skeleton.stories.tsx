import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from './skeleton';

function Shapes() {
  return (
    <div aria-busy="true" className="flex max-w-sm items-center gap-4">
      <Skeleton shape="circle" className="size-11" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton shape="text" className="w-2/3" />
        <Skeleton shape="text" className="h-3 w-1/3" />
      </div>
    </div>
  );
}

const meta = { title: 'Primitives/Skeleton', component: Shapes } satisfies Meta<typeof Shapes>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
