import { notify } from '@robes/copy';
import { Button, Eyebrow, Heading, Text } from '@robes/ui';
import type { Metadata } from 'next';
import { readUnsubToken, unsubscribe } from '@/server/unsubscribe';

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ t?: string; done?: string }> };

const copy = notify.unsubscribe;

// Opening the link changes nothing (mail scanners prefetch links); the button does.
export default async function UnsubscribePage({ searchParams }: Props) {
  const { t = '', done } = await searchParams;
  const target = readUnsubToken(t);

  async function stop() {
    'use server';
    await unsubscribe(t);
    const { redirect } = await import('next/navigation');
    redirect(`/unsubscribe?t=${encodeURIComponent(t)}&done=1`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      {!target ? (
        <Text>{copy.invalid}</Text>
      ) : done ? (
        <Text role="status">{copy.done}</Text>
      ) : (
        <>
          <Heading level={1} size="xl">
            {copy.title}
          </Heading>
          <Text tone="muted">{copy.body[target.pref]}</Text>
          <form action={stop}>
            <Button type="submit" variant="primary">
              {copy.confirm}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
