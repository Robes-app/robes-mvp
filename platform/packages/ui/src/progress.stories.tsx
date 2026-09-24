import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PROGRESS_STAGES, Progress } from './progress';

function Stages() {
  return (
    <div className="flex max-w-md flex-col gap-8">
      {PROGRESS_STAGES.map((stage, i) => (
        <Progress
          key={stage}
          stage={stage}
          value={i === 0 ? undefined : i / PROGRESS_STAGES.length}
        />
      ))}
    </div>
  );
}

const meta = { title: 'Primitives/Progress', component: Stages } satisfies Meta<typeof Stages>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
