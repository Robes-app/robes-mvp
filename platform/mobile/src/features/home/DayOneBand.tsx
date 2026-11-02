import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { diary } from '@robes/copy';
import { parseCellId } from '@robes/core/avatar';
import { DAY_ONE_KEYS } from '@robes/core/home';
import { Icon } from '@robes/icons/native';
import {
  Button,
  fonts,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { dayOneAsks } from './diary';
import { type PhotoSource, pickOne, usePhotoFiling } from './file-photo';

const copy = diary.dayOne;
const TILE = { width: 104, height: 132 };
const tile =
  'items-center justify-center gap-2 rounded-soft border border-dashed border-selected-line bg-surface';

type Ask = 'model' | 'pieces';

// The row's head: the icon, the small-caps ask, and the × that asks once.
function Head({
  icon,
  label,
  onDismiss,
}: {
  icon: 'user' | 'wardrobe';
  label: string;
  onDismiss: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <View className="flex-row items-center gap-2.5">
      <Icon name={icon} size={14} color={muted} />
      <RNText
        accessibilityRole="header"
        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
        className="flex-1 text-[10px] text-ink uppercase"
        style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.6 }}
      >
        {label}
      </RNText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${copy.dismiss}: ${label}`}
        onPress={onDismiss}
        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
        className="-mr-3 items-center justify-center rounded-pill"
      >
        <RNText className="text-base text-ink-muted" style={{ fontFamily: fonts.sans }}>
          ×
        </RNText>
      </Pressable>
    </View>
  );
}

// Day one (Front Door design 3a, plan 2026-11-02 §1.3): a full-bleed band above the strip with
// Choose your model (her twin's door, then the three Robes models) and Add your first pieces
// (Tops · Bottoms · Shoes · Anything), each with a × that asks once and then stands down. The
// web twin is app/src/components/home/day-one-band.tsx.
export function DayOneBand({ state }: { state: Today['home']['state'] }) {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const onPlan = useColor('surface-raised');
  const asks = dayOneAsks(state);
  const [asking, setAsking] = useState<Ask | null>(null);
  const [hidden, setHidden] = useState<Record<Ask, boolean>>({ model: false, pieces: false });
  const model = useApi('me.model.get', undefined, { enabled: asks.model });
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });

  const showModel = asks.model && !hidden.model;
  const showPieces = asks.pieces && !hidden.pieces;
  if (!showModel && !showPieces) return null;

  // Okay: the section folds away now and stays away (the dismissal store keeps the key).
  const dismiss = (ask: Ask) => {
    setAsking(null);
    setHidden((h) => ({ ...h, [ask]: true }));
    void api
      .call('notifications.dismiss', { input: { key: DAY_ONE_KEYS[ask] } })
      .then(refresh)
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  // A Robes model picked: her picks become that cell's, and it stands under her looks.
  const pick = (id: string) => {
    const cell = parseCellId(id);
    if (!cell) return;
    void api
      .call('me.model.update', { input: { skin: cell.skin, hair: cell.hair } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
        refresh();
      })
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  const chosen = model.data?.filed ? model.data.cellId : (model.data?.generics?.[0]?.id ?? null);

  return (
    <View
      accessibilityLabel={copy.model}
      className="-mx-5 gap-6 border-rule-mid border-y bg-surface-sunk px-5 pt-[18px] pb-5"
      testID="day-one"
    >
      {showModel ? (
        <View className="gap-3" testID="day-one-model">
          <Head icon="user" label={copy.model} onDismiss={() => setAsking('model')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-5"
            contentContainerClassName="gap-2.5 px-5"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.twin}
              onPress={() => router.push('/you/model')}
              style={TILE}
              className={`${tile} px-2.5`}
            >
              <Icon name="camera" size={15} color={muted} />
              <RNText
                className="text-center text-[11.5px] text-ink-muted"
                style={{ fontFamily: fonts.sans, lineHeight: 15 }}
              >
                {copy.twin}
              </RNText>
            </Pressable>
            {(model.data?.generics ?? []).map((g, i) => {
              const on = g.id === chosen;
              return (
                <Pressable
                  key={g.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={copy.modelPick(i + 1)}
                  onPress={() => pick(g.id)}
                  style={TILE}
                  className={`overflow-hidden rounded-soft border bg-surface ${
                    on ? 'border-selected-line' : 'border-transparent'
                  }`}
                  testID={`day-one-model-${i}`}
                >
                  {g.imageUrl ? (
                    // A signed catalog portrait in a fixed frame, the face kept in view.
                    <ExpoImage
                      source={{ uri: g.imageUrl }}
                      contentFit="cover"
                      contentPosition={{ top: '10%', left: '50%' }}
                      accessible={false}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Icon name="user" size={22} color={faint} />
                    </View>
                  )}
                  {on ? (
                    <View className="absolute bottom-2 left-2 size-5 items-center justify-center rounded-pill border-2 border-surface-raised bg-accent-plan">
                      <Icon name="check" size={10} color={onPlan} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.another}
              onPress={() => router.push('/you/model')}
              style={TILE}
              className={tile}
            >
              <RNText className="text-[11px] text-ink-faint" style={{ fontFamily: fonts.sans }}>
                +
              </RNText>
              <RNText className="text-[11px] text-ink-muted" style={{ fontFamily: fonts.sans }}>
                {copy.another}
              </RNText>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
      {showPieces ? <PiecesAsk onDismiss={() => setAsking('pieces')} onFiled={refresh} /> : null}
      {/* × asks once: a centred dialog, the cream card, the serif line, one ink Okay. */}
      <Modal
        visible={asking !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAsking(null)}
        testID="day-one-dialog"
      >
        <View className="flex-1 items-center justify-center px-8">
          <Pressable
            className="absolute inset-0 bg-ink/40"
            onPress={() => setAsking(null)}
            accessible={false}
          />
          <View accessibilityViewIsModal className="w-full gap-5 rounded-sheet bg-bg p-6">
            <Text
              className="font-display text-center"
              style={{ fontSize: 20, lineHeight: 28 }}
              accessibilityRole="header"
            >
              {asking === 'pieces' ? copy.piecesAsk : copy.modelAsk}
            </Text>
            <PrimaryScope>
              <Button onPress={() => asking && dismiss(asking)}>{copy.ok}</Button>
            </PrimaryScope>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Add your first pieces: four dashed tiles, each a camera for that kind of piece, with a quieter
// door to her files beneath.
function PiecesAsk({ onDismiss, onFiled }: { onDismiss: () => void; onFiled: () => void }) {
  const faint = useColor('ink-faint');
  const { filing, file, reset } = usePhotoFiling();
  const filed = filing.phase === 'filed';
  // One filed piece retires the ask; home reads the count again.
  useEffect(() => {
    if (filed) {
      reset();
      onFiled();
    }
  }, [filed, reset, onFiled]);
  const snap = async (source: PhotoSource) => {
    const photo = await pickOne(source);
    if (photo === 'denied' || !photo) return;
    void file(photo);
  };
  return (
    <View className="gap-3" testID="day-one-pieces">
      <Head icon="wardrobe" label={copy.pieces} onDismiss={onDismiss} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5"
        contentContainerClassName="gap-2.5 px-5"
      >
        {copy.tiles.map((what) => (
          <View key={what} style={TILE} className={`${tile} gap-1.5`}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.tile(what)}
              onPress={() => void snap('camera')}
              className="items-center gap-1.5 px-3 pt-3"
            >
              <Icon name="image" size={17} color={faint} />
              <RNText className="text-[13px] text-ink" style={{ fontFamily: fonts.sans }}>
                {what}
              </RNText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.browse}
              onPress={() => void snap('library')}
              className="min-h-7 items-center justify-center px-3 pb-2"
              testID={`day-one-browse-${what}`}
            >
              <RNText className="text-[10.5px] text-ink-muted" style={{ fontFamily: fonts.sans }}>
                or <RNText className="underline">{copy.browse.replace(/^or /, '')}</RNText>
              </RNText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
