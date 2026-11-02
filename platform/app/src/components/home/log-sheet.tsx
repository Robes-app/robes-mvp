'use client';

import { diary as copy } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Sheet } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { setPendingPhoto } from '@/lib/pending-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const row =
  'flex min-h-14 w-full items-center gap-3.5 border-t border-hairline px-1 text-left font-sans text-[13px] text-ink';
const disc =
  'flex size-10 shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-surface text-ink';

// What a day asks when she adds a look (design 3k, plan §1.6): past days "What did you wear?",
// today "What are you wearing?", a day ahead "What will you wear?"; then Pick Look (the drawer)
// or Capture Look (her photo, read into a look for that day). Native twin: features/home/LogSheet.tsx.
export function LogSheet({
  date,
  today,
  onClose,
  onPick,
}: {
  date: string | null;
  today: string;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const router = useRouter();
  const inputId = useId();
  const open = date !== null;
  const question = !date
    ? ''
    : date < today
      ? copy.log.past
      : date === today
        ? copy.log.today
        : copy.log.ahead;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      title={question}
      eyebrow={date ? `${weekdayLong(date)} ${Number(date.slice(8))}` : undefined}
    >
      <div className="flex flex-col" data-testid="log-sheet">
        <button
          type="button"
          onClick={() => date && onPick(date)}
          className={`${row} ${focus}`}
          data-testid="log-pick"
        >
          <span className={disc}>
            <Icon name="book" size={17} />
          </span>
          <span className="flex-1">{copy.log.pick}</span>
          <Icon name="forward" size={15} className="text-ink-faint" />
        </button>
        <label
          htmlFor={inputId}
          className={`${row} cursor-pointer border-b focus-within:outline-2 focus-within:outline-focus-ring`}
          data-testid="log-capture"
        >
          <input
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f && date) {
                setPendingPhoto(f);
                onClose();
                router.push(`/looks/new/photo?day=${date}`);
              }
            }}
          />
          <span className={disc}>
            <Icon name="camera" size={17} />
          </span>
          <span className="flex-1">{copy.log.capture}</span>
          <Icon name="forward" size={15} className="text-ink-faint" />
        </label>
      </div>
    </Sheet>
  );
}
