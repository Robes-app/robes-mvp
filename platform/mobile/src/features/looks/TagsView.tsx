import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook } from '@robes/copy';
import { matchesWearFor, toggleValue, wearForChoices } from '@robes/core/filters';
import { Icon } from '@robes/icons/native';
import {
  FINE_EDGE,
  fonts,
  OptionList,
  OptionRow,
  Subview,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

const copy = lookbook.savedLook.tagsView;

// The saved look's details (PR 6): one mutation for its tags, seasons and caption.
export function useLookDetails(look: Look) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  return useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
    },
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Felix's TagsView: the tags picker, a subview from Details › Tags. Every Wear it for option
// (WEAR_FOR_ALL, in its order), then any other tag the look already carries, as rows with a check
// once picked; the footer field adds one. Web twin:
// app/src/components/looks/tags-view.tsx.
export function TagsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookDetails(look);
  const [text, setText] = useState('');
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
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
      testID="tags-view"
      footer={
        <View
          className="flex-row items-center gap-2.5 rounded-pill border-rule-mid bg-surface-raised pl-4"
          style={{ height: 44, paddingRight: 6, borderWidth: FINE_EDGE }}
        >
          <Icon name="tag" size={15} color={muted} />
          <TextInput
            accessibilityLabel={copy.add}
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            returnKeyType="done"
            maxLength={40}
            placeholder={copy.add}
            placeholderTextColor={faint}
            className="flex-1"
            style={{ fontFamily: fonts.sans, fontSize: 14, color: ink, paddingVertical: 0 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.keep}
            disabled={!text.trim() || update.isPending}
            onPress={add}
            hitSlop={6}
            className="items-center justify-center rounded-pill bg-surface-sunk"
            style={{ width: 32, height: 32, opacity: text.trim() ? 1 : 0.4 }}
          >
            <Icon name="check" size={14} color={ink} />
          </Pressable>
        </View>
      }
    >
      <OptionList>
        {options.map((tag, i) => (
          <OptionRow
            key={tag}
            first={i === 0}
            label={tag}
            on={on(tag)}
            accessibilityLabel={copy.toggle(tag)}
            onToggle={() => toggle(tag)}
          />
        ))}
      </OptionList>
    </Subview>
  );
}
