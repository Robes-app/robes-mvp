import { marketing } from '@robes/copy';
import { Button, Eyebrow, Heading, Text } from '@robes/ui';
import type { Metadata } from 'next';
import { confirmWaitlist, readConfirmToken } from '@/server/waitlist';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const copy = marketing.waitlist;
type Props = { searchParams: Promise<{ t?: string; done?: string }> };

// Double opt-in: opening the link changes nothing (mail scanners prefetch); the button confirms.
export default async function ConfirmWaitlistPage({ searchParams }: Props) {
  const { t = '', done } = await searchParams;
  const valid = readConfirmToken(t) !== null;

  async function confirm() {
    'use server';
    await confirmWaitlist(t);
    const { redirect } = await import('next/navigation');
    redirect(`/waitlist/confirm?t=${encodeURIComponent(t)}&done=1`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Eyebrow>{copy.confirmEyebrow}</Eyebrow>
      {!valid ? (
        <Text>{copy.invalid}</Text>
      ) : done ? (
        <Text role="status">{copy.confirmed}</Text>
      ) : (
        <>
          <Heading level={1} size="xl">
            {copy.confirmTitle}
          </Heading>
          <form action={confirm}>
            <Button type="submit" variant="primary">
              {copy.confirm}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
