'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { OptionList, OptionRow, Subview, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = lookbook.savedLook.tagsView;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The saved look's tags (PR 6): her own tags, for both looks and pieces.
export function useLookTags(look: Look) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  return useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
    },
    onError: (err) => {
      toast({ message: errorCopy(err) });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Felix's TagsView: the tags picker, a subview from Details › Tags. Her tags — the ones her pieces
// and looks wear — as rows with a check once picked; the footer field adds one. Native twin:
// mobile/src/features/looks/TagsView.tsx.
export function TagsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookTags(look);
  // Her tag namespace, as the wardrobe's Filter reads it.
  const summary = useApi('wardrobe.summary', {}, { enabled: open });
  const [text, setText] = useState('');
  const options = [...new Set([...(summary.data?.wearFor ?? []), ...look.tags])];
  const set = (tags: string[]) => update.mutate({ params: { id: look.id }, input: { tags } });
  const toggle = (tag: string) =>
    set(look.tags.includes(tag) ? look.tags.filter((t) => t !== tag) : [...look.tags, tag]);
  const add = () => {
    const tag = text.trim();
    if (!tag) return;
    setText('');
    if (!look.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) set([...look.tags, tag]);
  };
  return (
    <Subview
      open={open}
      title={copy.title}
      onBack={onBack}
      testId="tags-view"
      footer={
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
            className="min-w-0 flex-1 bg-transparent font-light font-sans text-ink text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={!text.trim() || update.isPending}
            aria-label={copy.keep}
            className={`flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink disabled:opacity-40 ${focus}`}
          >
            <Icon name="check" size={14} />
          </button>
        </form>
      }
    >
      {options.length ? (
        <OptionList label={copy.title}>
          {options.map((tag) => (
            <OptionRow
              key={tag}
              label={tag}
              on={look.tags.includes(tag)}
              ariaLabel={copy.toggle(tag)}
              onToggle={() => toggle(tag)}
            />
          ))}
        </OptionList>
      ) : null}
    </Subview>
  );
}
