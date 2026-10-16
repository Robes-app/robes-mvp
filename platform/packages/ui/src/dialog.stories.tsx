import { ui } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { Dialog, Sheet } from './dialog';
import { Field } from './field';

function Demo() {
  return (
    <div className="flex gap-4">
      <Dialog
        title="Rename this look."
        description="Her words win: Robes never renames a saved title."
        trigger={<Button>Rename</Button>}
        footer={<Button variant="primary">Save this look</Button>}
      >
        <Field label="Title" defaultValue="Monday, Dublin" />
      </Dialog>
      <Sheet
        title="Create"
        description="Start something new."
        trigger={<Button>Open sheet</Button>}
      >
        <div className="flex flex-col gap-2">
          <Button block>Add a piece</Button>
          <Button block>Plan a trip</Button>
          <Button block variant="quiet">
            {ui.close}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

const meta = { title: 'Primitives/Dialog and Sheet', component: Demo } satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
export const OpenDialog: Story = {
  render: () => (
    <Dialog title="Rename this look." defaultOpen>
      <Field label="Title" defaultValue="Monday, Dublin" />
    </Dialog>
  ),
};
