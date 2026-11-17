import { queryKeys, useApiClient } from '@robes/api-client/react';
import { firstRun as copy, wardrobe } from '@robes/copy';
import type { StyleType } from '@robes/core/style-dna';
import { Button, ErrorText, fonts, maxFontSizeMultiplier, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { type CameraShot, ShotCamera, type ShotCameraCopy } from '@/features/capture/ShotCamera';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { useInvalidateLooks } from '@/features/looks/look-states';
import { REVIEW_MAX } from '@/features/wardrobe/add/flow';
import { nativeAnalytics } from '@/lib/analytics';
import { archetypeImages } from './archetype-images';
import type { Identity } from './Steps';
import { useUploadSitting } from './use-upload-sitting';

export type CaptureMode = 'looks' | 'pieces';

const cameraCopy = (mode: CaptureMode): ShotCameraCopy => {
  const c = copy[mode];
  return {
    title: mode === 'looks' ? copy.looks.title : wardrobe.camera.title,
    close: wardrobe.camera.close,
    shutter: wardrobe.capture.camera.shutter,
    photos: wardrobe.capture.camera.photos,
    hint: c.hint,
    next: c.next,
    full: c.full,
    denied: wardrobe.capture.camera.denied,
    allow: wardrobe.camera.allow,
    failed: wardrobe.addFailed,
    ready: c.ready,
    done: copy.save,
    taken: wardrobe.camera.taken,
    remove: copy.removePhoto,
  };
};

// A quiet text link under the step's one action (R-S2): Skip, Add more.
export function QuietLink({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      className="min-h-11 items-center justify-center self-center"
      testID={testID}
    >
      <Text size="small" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

// 05 Saved looks and 06 Pieces you love (onboarding PRD R-5, R-6; design Q3, Q4): the intro, then
// the shared ShotCamera — each photograph uploading as she takes it, a tap on its thumbnail taking
// it off — then Save N files them and the step says where they went, with Continue and Add more.
// A look: each photo its own saved look, its picture the photo, no piece filed (decision 2: she
// finds its pieces when she opens it). A piece: one per photo, read in the background, starred.
export function CaptureStep({
  mode,
  step,
  identity,
  styles,
  onBack,
  onDone,
  onSkip,
}: {
  mode: CaptureMode;
  step: number;
  identity: Identity | null;
  styles: readonly StyleType[];
  onBack: () => void;
  onDone: (n: number) => void;
  onSkip: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const refreshLooks = useInvalidateLooks();
  const sitting = useUploadSitting(mode === 'looks' ? 'look_photo' : 'wardrobe');
  const [view, setView] = useState<'intro' | 'camera' | 'saved'>('intro');
  const [saved, setSaved] = useState<CameraShot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = copy[mode];

  // Save N: nothing is a look or a piece before this tap (rule: a look is saved only when she
  // saves it). A failure keeps the sitting so she can try again.
  async function save() {
    if (saving || !sitting.ready) return;
    setSaving(true);
    setError(null);
    const assetIds = sitting.kept.flatMap((s) => (s.assetId ? [s.assetId] : []));
    try {
      if (mode === 'looks') {
        for (const photoAssetId of assetIds) {
          const look = await api.call('looks.create', {
            input: { status: 'saved', pieces: [], photoAssetId },
          });
          refreshLooks(look);
        }
      } else {
        const { pieces } = await api.call('wardrobe.batch', { input: { assetIds } });
        // Each starred in turn: the Hero Rack holds ten, so a piece past it files unstarred,
        // with nothing said (PRD risks).
        for (const piece of pieces) {
          await api
            .call('wardrobe.update', { params: { id: piece.id }, input: { hero: true } })
            .catch(() => {});
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
      }
      setSaved((all) => [...all, ...sitting.kept.map(({ key, uri }) => ({ key, uri }))]);
      sitting.reset();
      setView('saved');
    } catch {
      setError(c.failed);
      setView('intro');
    } finally {
      setSaving(false);
    }
  }

  if (view === 'camera') {
    return (
      <ShotCamera
        copy={cameraCopy(mode)}
        shots={sitting.shots}
        max={REVIEW_MAX}
        canDone={sitting.ready && !saving}
        onAdd={sitting.add}
        onRemove={sitting.remove}
        onDone={() => void save()}
        onClose={() => {
          for (const s of sitting.shots) sitting.remove(s.key);
          setView(saved.length ? 'saved' : 'intro');
        }}
      />
    );
  }

  if (view === 'saved') {
    return (
      <FirstRunFrame
        step={step}
        title={c.saved}
        titleEm={c.savedEm(saved.length)}
        footer={
          <>
            <Button
              variant="primary"
              onPress={() => {
                nativeAnalytics.track('onboarding_captured', { step: mode, n: saved.length });
                onDone(saved.length);
              }}
              testID="onboarding-continue"
            >
              {copy.continue}
            </Button>
            <QuietLink label={copy.addMore} onPress={() => setView('camera')} />
          </>
        }
      >
        <SavedGrid shots={saved} />
      </FirstRunFrame>
    );
  }

  return (
    <FirstRunFrame
      step={step}
      title={c.title}
      titleEm={c.titleEm}
      onBack={onBack}
      footer={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button
            variant="primary"
            onPress={() => setView('camera')}
            loading={saving}
            testID="onboarding-capture"
          >
            {mode === 'looks' ? copy.looks.choose : copy.pieces.add}
          </Button>
          <QuietLink label={copy.skip} onPress={onSkip} testID="onboarding-skip" />
        </>
      }
    >
      {mode === 'looks' ? <LooksFan identity={identity} styles={styles} /> : <PieceExamples />}
    </FirstRunFrame>
  );
}

// Three of her style's photographs, fanned (design Q3): the kind of picture this step keeps.
function LooksFan({
  identity,
  styles,
}: {
  identity: Identity | null;
  styles: readonly StyleType[];
}) {
  const muted = useColor('ink-muted');
  const photos = archetypeImages(styles[0] ?? 'Minimal', identity).slice(0, 3);
  const turn = [
    { x: -100, y: 16, r: '-6deg', z: 1 },
    { x: 100, y: 16, r: '6deg', z: 1 },
    { x: 0, y: 0, r: '0deg', z: 2 },
  ];
  return (
    <View className="gap-6">
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.body}
        style={{
          marginTop: -14,
          fontFamily: fonts.displayItalic,
          fontSize: 19,
          lineHeight: 26,
          color: muted,
        }}
      >
        {copy.looks.sub}
      </RNText>
      <View accessible={false} className="h-[220px] items-center justify-center">
        {photos.map(({ key, src }, i) => {
          const t = turn[i] ?? turn[2];
          return (
            <View
              key={key}
              className="absolute overflow-hidden rounded-thumb border-4 border-surface-raised bg-surface-sunk"
              style={{
                width: 140,
                height: 187,
                zIndex: t?.z,
                transform: [
                  { translateX: t?.x ?? 0 },
                  { translateY: t?.y ?? 0 },
                  { rotate: t?.r ?? '0deg' },
                ],
              }}
            >
              {src ? (
                <Image
                  source={src}
                  contentFit="cover"
                  accessible={false}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// The kinds of piece she might start from (design Q4): Jacket, Knit, Jeans, Dress, Boots, Bag.
// shortcut: the design's tiles carry example photographs; until licensed ones are bundled, each is
// a white card with its name.
function PieceExamples() {
  const ink = useColor('ink');
  return (
    <View accessible={false} className="flex-row flex-wrap gap-2.5">
      {copy.pieces.examples.map((label) => (
        <View
          key={label}
          className="h-[104px] items-center justify-center rounded-card border border-rule-mid bg-surface-raised"
          style={{ width: '31%' }}
        >
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.body}
            style={{ fontFamily: fonts.displayRegular, fontSize: 18, color: ink }}
          >
            {label}
          </RNText>
        </View>
      ))}
    </View>
  );
}

// What she just saved, three across with the sage tick (design's confirmation).
function SavedGrid({ shots }: { shots: readonly CameraShot[] }): ReactNode {
  return (
    <View className="flex-row flex-wrap gap-2.5" testID="onboarding-saved">
      {shots.map((s) => (
        <View
          key={s.key}
          className="overflow-hidden rounded-thumb bg-surface-raised"
          style={{ width: '31%', aspectRatio: 3 / 4 }}
        >
          <Image
            source={{ uri: s.uri }}
            contentFit="cover"
            accessible={false}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      ))}
    </View>
  );
}
