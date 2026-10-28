import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DayView } from './day-view';

const Params = z.object({ date: z.iso.date() });

// The day page: every day in the app opens this one screen (legacy ff87e89).
// Its way back (?from=today → Today, else the month) is in the top bar (lib/nav backFor).
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const parsed = Params.safeParse(await params);
  if (!parsed.success) notFound();
  return <DayView date={parsed.data.date} />;
}
