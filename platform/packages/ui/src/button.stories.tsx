import { auth } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: auth.verify, variant: 'primary' },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary', 'quiet'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Primary is the ink pill, secondary the hairline pill, quiet the text door. A screen may carry more than one primary.',
      },
    },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', children: auth.google } };
export const Quiet: Story = { args: { variant: 'quiet', children: auth.resend } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Block: Story = { args: { block: true } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="primary">{auth.verify}</Button>
      <Button variant="secondary">{auth.apple}</Button>
      <Button variant="quiet">{auth.useDifferentEmail}</Button>
    </div>
  ),
};
export const Dark: Story = { ...AllVariants, globals: { theme: 'dark' } };
