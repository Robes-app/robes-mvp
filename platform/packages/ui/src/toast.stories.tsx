import { ui } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { ToastProvider, useToast } from './toast';

function Triggers() {
  const toast = useToast();
  return (
    <div className="flex gap-3">
      <Button
        onClick={() =>
          toast({ message: 'Piece removed.', action: { label: ui.undo, onAction: () => {} } })
        }
      >
        Remove a piece
      </Button>
      <Button onClick={() => toast({ message: 'Saved to your Lookbook.' })}>Save</Button>
    </div>
  );
}

function Demo() {
  return (
    <ToastProvider>
      <Triggers />
    </ToastProvider>
  );
}

const meta = {
  title: 'Primitives/Toast',
  component: Demo,
  parameters: {
    docs: {
      description: {
        component:
          'Destructive actions run immediately with an Undo that stays up for ≥6 s (UX-15).',
      },
    },
  },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
