import { DailyLookParams } from '@robes/contracts';
import { notFound } from 'next/navigation';
import { DailyLookView } from '@/components/today/daily-look-view';

export default async function DailyLookPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = DailyLookParams.safeParse(await params);
  if (!parsed.success) notFound();
  return <DailyLookView id={parsed.data.id} />;
}
