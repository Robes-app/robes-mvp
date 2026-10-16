'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { plan } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Button, buttonClasses, Sheet, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LookImage } from '@/components/looks/look-image';
import { formatDay } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = plan.picker;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Add-a-look picker (legacy ff87e89, saved looks only since 2026-10-10): tap looks to tick
// them, add one or several at once; a look already on the day is shown, never offered twice.
export function LookPicker({
  date,
  title,
  onClose,
}: {
  date: string | null;
  title?: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const open = date !== null;
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setPicks([]);
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const onDay = new Set(day.data?.days[0]?.entries.map((e) => e.look.id) ?? []);
  const pin = useApiMutation('plan.pin');

  async function add() {
    if (!date || picks.length === 0) return;
    setSaving(true);
    try {
      for (const id of picks) await pin.mutateAsync({ params: { id }, input: { dates: [date] } });
      toast({ message: copy.added(picks.length, weekdayLong(date)) });
      onClose();
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
    }
  }

  const items = looks.data?.items ?? [];
  return (
    <Sheet
      title={title || copy.title}
      description={date ? copy.eyebrow(formatDay(date)) : undefined}
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      footer={
        items.length ? (
          picks.length ? (
            <Button variant="primary" loading={saving} onClick={() => void add()}>
              {copy.add(picks.length)}
            </Button>
          ) : (
            <Text size="small" tone="muted" className="text-center">
              {copy.hint}
            </Text>
          )
        ) : undefined
      }
    >
      {!looks.data ? (
        <div aria-busy className="grid grid-cols-3 gap-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-display text-2xl font-light text-ink">{copy.emptyTitle}</p>
          <Text tone="muted">{copy.emptyBody}</Text>
          <Link href="/looks" className={buttonClasses({ variant: 'secondary' })}>
            {copy.toLooks}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex items-baseline justify-between font-sans text-xs text-ink-muted">
            <span className="tracking-[0.18em] uppercase">{copy.yourLooks}</span>
            <span>{plan.list.looks(items.length)}</span>
          </p>
          <ul aria-label={copy.yourLooks} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((look) => {
              const had = onDay.has(look.id);
              const on = picks.includes(look.id);
              return (
                <li key={look.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={had}
                    onClick={() =>
                      setPicks((p) => (on ? p.filter((x) => x !== look.id) : [...p, look.id]))
                    }
                    className={`relative flex w-full flex-col rounded-crisp border p-1.5 text-left ${
                      on ? 'border-ink' : 'border-hairline hover:border-border-control'
                    } ${had ? 'opacity-60' : ''} ${focus}`}
                  >
                    <LookImage look={look} sizes="160px" />
                    {on ? (
                      <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-pill bg-ink text-bg">
                        <Icon name="check" size={14} />
                      </span>
                    ) : null}
                    <span className="mt-2 truncate px-0.5 font-display text-base text-ink">
                      {look.name}
                    </span>
                    <span className="mt-1 truncate px-0.5 font-sans text-[9px] tracking-[0.14em] text-ink-muted uppercase">
                      {had
                        ? copy.already
                        : look.lastWornOn
                          ? copy.lastWorn(formatDay(look.lastWornOn))
                          : copy.neverWorn}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
