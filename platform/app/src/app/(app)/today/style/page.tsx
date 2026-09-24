import { today } from '@robes/copy';
import { PageHeader } from '@/components/page-header';
import { DailyForm } from './daily-form';

export default function StyleTodayPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={today.daily.eyebrow} title={today.daily.title} />
      <DailyForm />
    </div>
  );
}
