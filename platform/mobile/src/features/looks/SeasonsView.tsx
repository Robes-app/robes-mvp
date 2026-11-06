import type { Look, Season } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { SEASONS } from '@robes/core/taxonomy';
import { Icon } from '@robes/icons/native';
import { OptionList, OptionRow, Subview, useColor } from '@robes/ui-native';
import { useLookDetails } from './TagsView';

const copy = lookbook.savedLook.seasonsView;

// Felix's SeasonsView (D12): Year round (no glyph), then the four seasons with their glyphs; any
// of them, Year round clears the rest. Back writes nothing extra. Web twin:
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
    <Subview open={open} title={copy.title} onBack={onBack} testID="seasons-view">
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
    </Subview>
  );
}
