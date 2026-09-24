import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Image } from './image';

const HASH = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';

function Frames() {
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-4">
      {(['4:5', '1:1', '3:4'] as const).map((aspect) => (
        <figure key={aspect} className="flex flex-col gap-2">
          <Image src="/story-missing.webp" blurhash={HASH} alt="" aspect={aspect} />
          <figcaption className="text-xs text-ink-muted">{aspect}</figcaption>
        </figure>
      ))}
    </div>
  );
}

const meta = {
  title: 'Primitives/Image',
  component: Frames,
  parameters: {
    docs: {
      description: {
        component:
          'Fixed aspect frames (4:5, 1:1, 3:4) sized before any bytes arrive, a blurhash placeholder decoded to a 32px canvas, and a fade-in once loaded.',
      },
    },
  },
} satisfies Meta<typeof Frames>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholders: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
