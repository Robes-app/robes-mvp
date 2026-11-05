import { useApi } from '@robes/api-client/react';
import type { DiaryDay, DiaryDraft } from '@robes/contracts';
import { diary, lookbook } from '@robes/copy';
import { weekdayDay } from '@robes/core/calendar';
import { shortRange } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { fonts, Image, maxFontSizeMultiplier, Skeleton, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text as RNText, View } from 'react-native';
import { useDressingLine } from '@/features/looks/DraftPage';
import { lookHero } from '@/features/looks/LookTile';
import { OnPhoto } from '@/features/looks/LookTiles';
import { ScanLine } from '@/features/looks/ScanLine';
import { renditionUri } from '@/lib/images';

const d = lookbook.draft;

// The draft tile in the day's slot (Front Door design 3b, plan 2026-11-03 §1.2): where Add look
// stood. Dressing — the bare model under the scan line, the day's reading, the lines, the rack's
// thumbs; then the draft, its bar opening the page; ↻ asks for another take, same brief. Web
// twin: components/home/draft-tile.tsx.
export function DraftTile({
  draft,
  day,
  today,
  width,
  onAnother,
  anotherBusy,
}: {
  draft: DiaryDraft;
  day: DiaryDay;
  today: string;
  width: number;
  onAnother: (lookId: string) => void;
  anotherBusy: boolean;
}) {
  const router = useRouter();
  const look = draft.look;
  const model = useApi('me.model.get', undefined, { enabled: !look?.image });
  const rose = useColor('accent-inspire');
  const generating =
    anotherBusy || !look || look.framePending || (!look.image && draft.jobId !== null);
  const line = useDressingLine(anotherBusy ? d.linesAgain : d.linesFirst, generating);
  const stand = model.data?.stand?.imageUrl ?? null;
  const uri = look ? renditionUri(lookHero(look), width) : null;
  const read = [
    day.date === today ? diary.today : weekdayDay(day.date),
    day.weather?.city ?? null,
    day.weather ? shortRange(day.weather.tempRange) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const thumbs = look?.pieces.slice(0, 5) ?? [];
  const stale = !generating && look?.pictureStale === true;
  const open = () => {
    if (look) router.push(`/look/${look.id}?day=${day.date}`);
  };
  return (
    <View
      style={{ width }}
      className="overflow-hidden rounded-[6px] border border-rule-mid bg-surface-raised"
      testID="draft-tile"
      accessibilityState={{ busy: generating }}
    >
      <View className="aspect-[4/5] overflow-hidden bg-surface">
        <View style={{ opacity: generating ? 0.55 : stale ? 0.8 : 1 }}>
          {uri ? (
            <Image source={uri} alt="" aspect="4:5" blurhash={look?.image?.blurhash} />
          ) : stand ? (
            <Image source={stand} alt="" aspect="4:5" />
          ) : (
            <Skeleton width="100%" aspectRatio={4 / 5} />
          )}
        </View>
        {generating ? (
          <>
            <ScanLine />
            <View
              pointerEvents="none"
              className="absolute inset-x-0 bottom-0 gap-2 bg-bg/90 px-4 pt-4 pb-4"
              accessibilityLiveRegion="polite"
            >
              <View className="flex-row items-center gap-2">
                <Icon name="looks" size={14} color={rose} />
                <Text
                  size="caption"
                  tone="muted"
                  className="uppercase"
                  style={{ fontSize: 9, letterSpacing: 1.8 }}
                >
                  {read}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.displayItalic, fontSize: 19, lineHeight: 28 }}>
                {line}
              </Text>
              <Text size="caption" tone="faint" style={{ fontSize: 10 }}>
                {d.usually}
              </Text>
            </View>
          </>
        ) : null}
        {stale ? (
          <View
            accessibilityLabel={d.behind(1)}
            className="absolute top-3 left-3 h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5"
          >
            <Text size="caption" className="text-bg" style={{ fontSize: 10 }}>
              1
            </Text>
          </View>
        ) : null}
        {!generating && look?.setId ? (
          <View className="absolute bottom-3 left-3">
            <OnPhoto icon="undo" label={d.tileRegen} size={36} onPress={() => onAnother(look.id)} />
          </View>
        ) : null}
      </View>
      {generating && thumbs.length ? (
        <View className="flex-row items-center gap-2.5 border-hairline border-t px-3.5 py-2">
          <Text
            size="caption"
            tone="faint"
            className="uppercase"
            style={{ fontSize: 9, letterSpacing: 1.8 }}
          >
            {d.rack}
          </Text>
          <View className="flex-row gap-1.5">
            {thumbs.map((p) => {
              const thumb = renditionUri(p.piece.image, 34);
              return (
                <View
                  key={p.piece.id}
                  className="overflow-hidden rounded-[4px] border border-rule-mid bg-surface-raised"
                  style={{ width: 34, height: 42 }}
                >
                  {thumb ? <Image source={thumb} alt="" aspect="4:5" /> : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole={generating ? undefined : 'button'}
        accessibilityLabel={generating ? d.tileDressing : d.open}
        disabled={generating}
        onPress={open}
        className="min-h-[45px] flex-row items-center justify-center gap-1.5 bg-surface px-3.5"
      >
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className={`uppercase ${generating ? 'text-ink-faint' : 'text-ink'}`}
          style={{ fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.6 }}
        >
          {generating ? d.tileDressing : d.tileBar}
        </RNText>
        {generating ? null : (
          <RNText className="text-ink-faint" style={{ fontFamily: fonts.sans, fontSize: 15 }}>
            ›
          </RNText>
        )}
      </Pressable>
    </View>
  );
}
