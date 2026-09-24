import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardSkeleton } from './card';
import { Image } from './image';

// No bytes behind this src, so the blurhash placeholder stays visible.
const PHOTO = '/story-missing.webp';
const HASH = 'LKO2:N%2Tw=w]~RBVZRi};RPxuwH';

function Grid() {
  return (
    <div className="grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
      <Card
        media={<Image src={PHOTO} blurhash={HASH} alt="A camel coat" aspect="4:5" />}
        eyebrow="Key piece"
        title="Camel coat"
        meta="Worn three ways"
      />
      <Card eyebrow="Daily look" title="Monday" meta="Dublin · 20°C" />
      <CardSkeleton aspect="4:5" />
    </div>
  );
}

const meta = { title: 'Primitives/Card', component: Grid } satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
