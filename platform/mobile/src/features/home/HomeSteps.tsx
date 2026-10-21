import type { Home, HomePiece } from '@robes/contracts';
import { home as copy } from '@robes/copy';
import { type HomeResolved, type HomeStep, mapRows } from '@robes/core/home';
import { anchorName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { Button, Em, Eyebrow, Heading, Image, Text, useColor, useToast } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SwapSheet } from '@/features/looks/SwapSheet';
import { useAddPieces } from '@/features/wardrobe/add-pieces';
import { renditionUri } from '@/lib/images';

const card = 'gap-4 rounded-soft border border-hairline bg-surface p-5';

function Title({ title, em }: { title: string; em: string }) {
  return (
    <Heading size="md">
      {title} <Em>{em}</Em>
    </Heading>
  );
}

function Thumb({ piece, width }: { piece: HomePiece; width: number }) {
  const uri = renditionUri(piece.image, width);
  return (
    <View style={{ width }}>
      {uri ? (
        <Image source={uri} alt="" blurhash={piece.image?.blurhash} />
      ) : (
        <View className="aspect-[4/5] rounded-crisp bg-surface-sunk" />
      )}
    </View>
  );
}

function Later({ onLater }: { onLater: () => void }) {
  return (
    <Button variant="quiet" onPress={onLater} className="self-center">
      {copy.later}
    </Button>
  );
}

// O1 · Style DNA: one door while nothing is filed (f044b35), her chips once anything is.
function StyleCard({ rows, onLater }: { rows: Home['rows']; onLater: () => void }) {
  const router = useRouter();
  const any = rows.brands.length + rows.icons.length + rows.styles.length > 0;
  const go = () => router.push('/you/style');
  return (
    <View className={card} testID="home-O1">
      <Eyebrow>{copy.o1.eyebrow}</Eyebrow>
      <Title title={copy.o1.title} em={copy.o1.titleEm} />
      <Text tone="muted">{any ? copy.o1.body : copy.o1.bodyEmpty}</Text>
      {any ? (
        <>
          {(['brands', 'icons', 'styles'] as const).map((k) => (
            <Pressable
              key={k}
              accessibilityRole="link"
              accessibilityLabel={`${copy.o1.rows[k]}: ${rows[k].join(', ') || copy.o1.add}`}
              onPress={go}
              className="min-h-11 flex-row items-center gap-4 border-hairline border-t py-2"
            >
              <Text size="caption" tone="muted" className="w-16 uppercase">
                {copy.o1.rows[k]}
              </Text>
              <Text size="small" tone={rows[k].length ? 'ink' : 'muted'} className="flex-1">
                {rows[k].join(' · ') || copy.o1.add}
              </Text>
            </Pressable>
          ))}
          <Button variant="secondary" onPress={go}>
            {copy.o1.finish}
          </Button>
        </>
      ) : (
        <Button onPress={go}>{copy.o1.one}</Button>
      )}
      <Later onLater={onLater} />
    </View>
  );
}

// O2 · the twin: two dashed slots, every tap opens the twin page.
function TwinCard({ onLater }: { onLater: () => void }) {
  const router = useRouter();
  const go = () => router.push('/you/model');
  return (
    <View className={card} testID="home-O2">
      <View className="flex-row gap-3">
        {[copy.o2.closeUp, copy.o2.full].map((label) => (
          <Pressable
            key={label}
            accessibilityRole="link"
            accessibilityLabel={label}
            onPress={go}
            className="aspect-[4/5] flex-1 items-center justify-end rounded-crisp border border-border-control border-dashed p-3"
            style={{ maxWidth: 150 }}
          >
            <Text size="small" tone="muted">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Eyebrow>{copy.o2.eyebrow}</Eyebrow>
      <Title title={copy.o2.title} em={copy.o2.titleEm} />
      <Text tone="muted">{copy.o2.body}</Text>
      <Button variant="secondary" onPress={go}>
        {copy.o2.cta}
      </Button>
      <Later onLater={onLater} />
    </View>
  );
}

// O3 · the wardrobe: the count once, in words; several at once from the roll, or a receipt.
function WardrobeCard({ pics, recent }: { pics: number; recent: HomePiece[] }) {
  const router = useRouter();
  const toast = useToast();
  const muted = useColor('ink-muted');
  const { add, busy } = useAddPieces();
  const snap = () =>
    void add('library').then((r) => {
      if (r.status === 'denied' || r.status === 'failed') toast.show({ message: r.message });
      if (r.status === 'added') router.push('/wardrobe');
    });
  const route = (title: string, line: string, icon: 'camera' | 'mail', onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={busy}
      className="min-h-11 flex-row items-center gap-4 rounded-crisp border border-hairline px-4 py-3"
    >
      <Icon name={icon} size={22} color={muted} />
      <View className="flex-1">
        <Text>{title}</Text>
        <Text size="small" tone="muted">
          {line}
        </Text>
      </View>
      <Icon name="forward" size={16} color={muted} />
    </Pressable>
  );
  return (
    <View className={card} testID="home-O3">
      <Eyebrow>{copy.o3.eyebrow}</Eyebrow>
      <Heading size="md">
        {pics === 0 ? copy.o3.empty : `${copy.o3.filed(pics)} `}
        {pics === 0 ? null : <Em>{copy.o3.rest}</Em>}
      </Heading>
      <View className="flex-row gap-2">
        {recent.map((p) => (
          <Thumb key={p.id} piece={p} width={52} />
        ))}
      </View>
      {route(copy.o3.snap.title, copy.o3.snap.line, 'camera', snap)}
      {route(copy.o3.receipt.title, copy.o3.receipt.line, 'mail', () =>
        router.push('/you/receipts'),
      )}
    </View>
  );
}

// O4 · the first look: three candidates, the first picked; the pick anchors the look.
function FirstLookCard({ candidates }: { candidates: HomePiece[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<HomePiece | null>(null);
  const [all, setAll] = useState(false);
  const pick = picked ?? candidates[0] ?? null;
  const shown =
    pick && !candidates.some((c) => c.id === pick.id)
      ? [pick, ...candidates.slice(0, 2)]
      : candidates;
  return (
    <View className={card} testID="home-O4">
      <Eyebrow>{copy.o4.eyebrow}</Eyebrow>
      <Title title={copy.o4.title} em={copy.o4.titleEm} />
      <Text tone="muted">{copy.o4.body}</Text>
      <View className="flex-row gap-3">
        {shown.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityState={{ selected: pick?.id === p.id }}
            accessibilityLabel={copy.o4.pick(anchorName(p.label, p.brand))}
            onPress={() => setPicked(p)}
            className={`flex-1 gap-1 rounded-crisp border p-1 ${pick?.id === p.id ? 'border-ink' : 'border-hairline'}`}
          >
            <Thumb piece={p} width={90} />
            <Text size="caption" numberOfLines={2}>
              {anchorName(p.label, p.brand)}
            </Text>
          </Pressable>
        ))}
      </View>
      {pick ? (
        <Button
          variant="secondary"
          onPress={() => router.push({ pathname: '/looks/new', params: { pieceId: pick.id } })}
        >
          {copy.o4.cta}
        </Button>
      ) : null}
      <Button variant="quiet" onPress={() => setAll(true)} className="self-center">
        {copy.o4.all}
      </Button>
      <SwapSheet
        open={all}
        swapping={null}
        onRack={[]}
        onClose={() => setAll(false)}
        onPick={(p) => setPicked({ id: p.id, label: p.label, brand: p.brand, image: p.image })}
      />
    </View>
  );
}

export function StepCard({
  step,
  home,
  onLater,
}: {
  step: HomeStep;
  home: Home;
  onLater: (step: HomeStep) => void;
}) {
  if (step === 'O1') return <StyleCard rows={home.rows} onLater={() => onLater('O1')} />;
  if (step === 'O2') return <TwinCard onLater={() => onLater('O2')} />;
  if (step === 'O3') return <WardrobeCard pics={home.state.pics} recent={home.recent} />;
  return <FirstLookCard candidates={home.candidates} />;
}

const DONE_HREF: Record<HomeStep, Href> = {
  O1: '/you/style',
  O2: '/you/model',
  O3: '/wardrobe',
  O4: '/looks',
};

// G1 · the map: an open row expands its module, a done row opens its page.
export function StepMap({
  resolved,
  pics,
  onExpand,
}: {
  resolved: HomeResolved;
  pics: number;
  onExpand: (step: HomeStep) => void;
}) {
  const router = useRouter();
  const muted = useColor('ink-muted');
  const keys = mapRows(resolved);
  if (!keys.length) return null;
  return (
    <View testID="home-map">
      {resolved.activated ? null : <Eyebrow>{copy.map.title}</Eyebrow>}
      {keys.map((k) => {
        const done = resolved.done[k];
        const line = k === 'O3' ? copy.map.line.O3(pics) : copy.map.line[k](done);
        return (
          <Pressable
            key={k}
            accessibilityRole={done || resolved.activated ? 'link' : 'button'}
            accessibilityLabel={`${copy.map.steps[k]}, ${line}`}
            onPress={() => (done || resolved.activated ? router.push(DONE_HREF[k]) : onExpand(k))}
            className="min-h-11 flex-row items-center gap-4 border-hairline border-b py-3"
            testID={`home-map-${k}`}
          >
            <View
              className={`h-6 w-6 items-center justify-center rounded-pill border ${done ? 'border-hairline' : 'border-border-control border-dashed'}`}
            >
              {done ? <Text className="text-accent-warm text-xs">✓</Text> : null}
            </View>
            <View className="flex-1">
              <Text>{copy.map.steps[k]}</Text>
              <Text size="small" tone="muted">
                {line}
              </Text>
            </View>
            <Icon name="forward" size={16} color={muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
