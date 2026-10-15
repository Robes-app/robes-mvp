import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DayView } from './day-view';

const Params = z.object({ date: z.iso.date() });

// The day page: every day in the app opens this one screen (legacy ff87e89).
export default async function DayPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const parsed = Params.safeParse(await params);
  if (!parsed.success) notFound();
  const from = (await searchParams).from === 'today' ? 'today' : 'plan';
  return <DayView date={parsed.data.date} from={from} />;
}
