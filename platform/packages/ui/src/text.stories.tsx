import { marketing } from '@robes/copy';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Eyebrow, Heading, Text } from './text';

function Specimen() {
  return (
    <div className="flex flex-col gap-4">
      <Eyebrow>{marketing.eyebrow}</Eyebrow>
      <Heading level={1} size="2xl">
        {marketing.title}
      </Heading>
      <Heading level={2} size="xl">
        Your piece, <em className="text-ink-muted">worn three ways.</em>
      </Heading>
      <Heading level={3} size="lg">
        Nothing planned this week.
      </Heading>
      <Heading level={4} size="md" italic>
        Reading your week…
      </Heading>
      <Heading level={4} size="sm">
        The serif floor is 18px.
      </Heading>
      <Text>{marketing.subtitle}</Text>
      <Text size="small" tone="muted">
        Monday · Dublin · 20°C
      </Text>
      <Text size="caption" tone="faint">
        In your wardrobe
      </Text>
    </div>
  );
}

const meta = { title: 'Primitives/Typography', component: Specimen } satisfies Meta<
  typeof Specimen
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { globals: { theme: 'dark' } };
