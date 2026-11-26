'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { matchesWearFor, toggleValue, wearForChoices } from '@robes/core/filters';
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

// Felix's TagsView: the tags picker, a subview from Details › Tags. Every Wear it for option
// (WEAR_FOR_ALL, in its order), then any other tag the look already carries, as rows with a check
// once picked; the footer field adds one. Native twin:
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
  const [text, setText] = useState('');
  // The whole list even before her pieces carry any of it (B8), so nothing is hidden.
  const options = wearForChoices([{ wearFor: look.tags }]);
  const on = (tag: string) => matchesWearFor(look.tags, [tag]);
  const set = (tags: string[]) => update.mutate({ params: { id: look.id }, input: { tags } });
  const toggle = (tag: string) => set(toggleValue(look.tags, tag));
  const add = () => {
    const typed = text.trim();
    if (!typed) return;
    setText('');
    // "work" typed is the list's Work.
    const tag = options.find((o) => matchesWearFor([o], [typed])) ?? typed;
    if (!on(tag)) set([...look.tags, tag]);
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
      <OptionList label={copy.title}>
        {options.map((tag) => (
          <OptionRow
            key={tag}
            label={tag}
            on={on(tag)}
            ariaLabel={copy.toggle(tag)}
            onToggle={() => toggle(tag)}
          />
        ))}
      </OptionList>
    </Subview>
  );
}
