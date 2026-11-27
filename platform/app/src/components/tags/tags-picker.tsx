'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { HerTag } from '@robes/contracts';
import { tags as copy } from '@robes/copy';
import { drawerOrder, matchesWearFor, toggleValue } from '@robes/core/filters';
import { Icon } from '@robes/icons/web';
import { AlertDialog, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// What a deleted tag was on: every list and page that shows a look's or a piece's tags.
const TAGGED_ROUTES = [
  'tags.list',
  'looks.list',
  'looks.get',
  'wardrobe.list',
  'wardrobe.get',
  'wardrobe.summary',
] as const;

// Her tags (tags cleanup, 26 Nov): one picker for a look's tags and a piece's alike. Her own tags
// lead, newest first, then the defaults (`drawerOrder`); a tap ticks one and is the answer. "Add a
// tag" makes one and ticks it ("work" typed is her Work). The web has no swipe: each row's bin
// (on hover or focus; always shown where there is no hover) deletes the tag from her list and
// from everything carrying it, asking first when anything does. Native twin:
// mobile/src/features/tags/TagsSheet.tsx.
export function useTagsPicker(selected: readonly string[], onChange: (tags: string[]) => void) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useApi('tags.list');
  const [text, setText] = useState('');
  const [asking, setAsking] = useState<HerTag | null>(null);
  const refresh = () =>
    Promise.all(
      TAGGED_ROUTES.map((r) => queryClient.invalidateQueries({ queryKey: queryKeys.route(r) })),
    );
  const remove = useApiMutation('tags.delete', {
    onSuccess: refresh,
    onError: (err) => {
      toast({ message: errorCopy(err) });
      void refresh();
    },
  });

  const mine = drawerOrder(list.data?.items ?? []);
  // A tag just ticked or typed that the list has not caught up with yet still shows, on top.
  const pending = selected.filter((s) => !mine.some((t) => matchesWearFor([t.label], [s])));
  const rows = [
    ...pending.map((label) => ({ label, tag: null })),
    ...mine.map((t) => ({ label: t.label, tag: t })),
  ];
  const on = (label: string) => matchesWearFor(selected, [label]);
  const add = () => {
    const typed = text.trim();
    if (!typed) return;
    setText('');
    const known = rows.find((r) => matchesWearFor([r.label], [typed]))?.label ?? typed;
    if (!on(known)) onChange([...selected, known]);
  };
  const drop = (tag: HerTag) => {
    if (tag.looks + tag.pieces === 0) remove.mutate({ params: { id: tag.id } });
    else setAsking(tag);
  };

  const listView = (
    <>
      <ul
        aria-label={copy.title}
        className="divide-y divide-hairline overflow-hidden rounded-soft border-[0.5px] border-rule-mid bg-surface-raised"
      >
        {rows.map(({ label, tag }) => (
          <li key={tag?.id ?? `new-${label}`} className="group flex items-center bg-surface-raised">
            <button
              type="button"
              aria-pressed={on(label)}
              aria-label={copy.toggle(label)}
              onClick={() => onChange(toggleValue(selected, label))}
              className={`flex h-12 min-w-0 flex-1 items-center gap-3 pr-2 pl-4 text-left ${focus} focus-visible:-outline-offset-2`}
            >
              <span className="type-piece-name min-w-0 flex-1 truncate text-ink">{label}</span>
              <span className="flex size-5 shrink-0 items-center justify-center text-ink">
                {on(label) ? <Icon name="check" size={15} /> : null}
              </span>
            </button>
            {tag ? (
              <button
                type="button"
                aria-label={copy.deleteLabel(label)}
                onClick={() => drop(tag)}
                className={`mr-1 flex size-11 shrink-0 items-center justify-center text-ink-muted opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${focus}`}
              >
                <Icon name="trash" size={15} />
              </button>
            ) : (
              <span className="mr-1 size-11 shrink-0" />
            )}
          </li>
        ))}
      </ul>
      <AlertDialog
        open={asking !== null}
        title={asking ? copy.confirmTitle(asking.label) : ''}
        message={asking ? copy.confirmBody(asking.looks, asking.pieces) : ''}
        actions={[
          {
            label: copy.delete,
            variant: 'danger',
            onClick: () => {
              if (asking) remove.mutate({ params: { id: asking.id } });
              setAsking(null);
            },
          },
          { label: copy.cancel, variant: 'quiet', onClick: () => setAsking(null) },
        ]}
        onDismiss={() => setAsking(null)}
      />
    </>
  );

  const addField = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
      className="flex h-11 items-center gap-2.5 rounded-pill border-[0.5px] border-rule-mid bg-surface-raised pr-1.5 pl-4"
    >
      <Icon name="tag" size={15} className="shrink-0 text-ink-muted" />
      <input
        aria-label={copy.add}
        value={text}
        placeholder={copy.add}
        maxLength={40}
        onChange={(e) => setText(e.target.value)}
        className="min-w-0 flex-1 bg-transparent font-light font-sans text-base text-ink outline-none placeholder:text-ink-faint sm:text-sm"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        aria-label={copy.keep}
        className={`flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink disabled:opacity-40 ${focus}`}
      >
        <Icon name="check" size={14} />
      </button>
    </form>
  );

  return { list: listView, addField };
}
