import type { Look, Season } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { SEASONS } from '@robes/core/taxonomy';
import { Icon } from '@robes/icons/native';
import { OptionList, OptionRow, useColor } from '@robes/ui-native';
import { View } from 'react-native';
import { DetentSheet } from '@/components/DetentSheet';
import { useLookDetails } from './TagsView';

const copy = lookbook.savedLook.seasonsView;

// Felix's SeasonsView (D12): Year round (no glyph), then the four seasons with their glyphs; any
// of them, Year round clears the rest. On iOS's own sheet, as a piece's Seasons is (Annie, 17 Nov):
// each tap is the answer, so Done is the one way out. Web twin (a drawer's subview):
// app/src/components/looks/seasons-view.tsx.
export function SeasonsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookDetails(look);
  const ink = useColor('ink');
  const set = (seasons: Season[]) => update.mutate({ params: { id: look.id }, input: { seasons } });
  const toggle = (s: Season) =>
    set(look.seasons.includes(s) ? look.seasons.filter((x) => x !== s) : [...look.seasons, s]);
  return (
    <DetentSheet
      open={open}
      onClose={onBack}
      title={copy.title}
      done={{ label: copy.done, onPress: onBack }}
      leading={<View style={{ width: 36 }} />}
      scroll
      testID="seasons-view"
    >
      <OptionList>
        <OptionRow
          first
          label={copy.yearRound}
          on={look.seasons.length === 0}
          onToggle={() => set([])}
        />
        {SEASONS.map((s) => (
          <OptionRow
            key={s}
            label={copy.names[s]}
            on={look.seasons.includes(s)}
            icon={<Icon name={s} size={18} color={ink} />}
            onToggle={() => toggle(s)}
          />
        ))}
      </OptionList>
    </DetentSheet>
  );
}
