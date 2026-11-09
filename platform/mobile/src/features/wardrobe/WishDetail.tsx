import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { UpdateWishInput, Wish } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Heading,
  IconButton,
  Image,
  PrimaryScope,
  Skeleton,
  Tabs,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { type FieldInput, type PieceField, PieceFieldSheet } from './PieceFieldSheet';
import { RecordRows, type RecordTab, type RecordValues } from './PieceRows';
import { useRemoveWish } from './wishlist';

const TABS = [copy.piece.tabs.piece, copy.piece.tabs.colour] as const;
type TabLabel = (typeof TABS)[number];
const TAB_OF: Record<TabLabel, RecordTab> = {
  [copy.piece.tabs.piece]: 'piece',
  [copy.piece.tabs.colour]: 'colour',
};

// A wish's record as the drawers read it: a wish has a note, no wears and no seasons yet.
export function wishValues(wish: Wish): RecordValues & { category: string } {
  return {
    label: wish.label,
    brand: wish.brand,
    notes: wish.note,
    category: wish.category,
    categoryL2: wish.categoryL2,
    categoryL3: wish.categoryL3,
    colourShade: wish.colourShade,
    colourExtra: wish.colourExtra,
    print: wish.print,
    material: wish.material,
    wearFor: [],
    size: wish.size,
    price: wish.price,
    currency: wish.currency,
    seasonBand: null,
    sourceLabel: wish.sourceLabel,
  };
}

// What a drawer wrote, in the wish's own fields.
export function wishInput(input: FieldInput): UpdateWishInput {
  const {
    notes,
    seasons: _seasons,
    seasonBand: _band,
    wearFor: _wear,
    hero: _hero,
    heroPosition: _pos,
    ...rest
  } = input;
  return { ...rest, ...(notes !== undefined ? { note: notes } : {}) };
}

// A wish's page (Front Door PRD rev 3 §7.3): the piece's anatomy — the photograph, her name for
// it, PIECE · COLOUR over the record's rows with Shop (the retailer) where an owned piece has its
// brand — and Bought where Delete piece sits; Remove from wishlist is the quiet way out. A wish
// carries no wears or seasons yet, so there is no WEARING tab. Web twin:
// app/src/components/wardrobe/wish-detail.tsx.
export function WishDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const ink = useColor('ink');
  const [field, setField] = useState<PieceField | null>(null);
  const [tab, setTab] = useState<TabLabel>(TABS[0]);
  const query = useApi('wishlist.get', { params: { id } });
  const update = useApiMutation('wishlist.update', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wishlist.get', { params: { id: saved.id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
    },
  });
  // Bought: the wish becomes a piece, and the page becomes the piece's.
  const promote = useApiMutation('wishlist.promote', {
    onSuccess: async (piece) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
      ]);
      router.replace({ pathname: '/piece/[id]', params: { id: piece.id } });
    },
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  const remove = useRemoveWish();
  if (query.isPending) {
    return (
      <View className="gap-4 px-6">
        <Skeleton width="100%" aspectRatio={4 / 5} />
        <Skeleton shape="text" width="60%" height={28} />
      </View>
    );
  }
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const wish = query.data;
  const uri = renditionUri(wish.image, 400);
  const values = wishValues(wish);
  return (
    <View className="flex-1" testID="wish-detail">
      <ScrollView contentContainerClassName="gap-5 px-6 pb-10">
        <View className="rounded-crisp border border-hairline bg-surface-raised p-4">
          {uri ? (
            <Image
              source={uri}
              alt={copy.photoAlt(wish.label)}
              blurhash={wish.image?.blurhash}
              contentFit="contain"
            />
          ) : (
            <View
              accessibilityElementsHidden
              className="items-center justify-center"
              style={{ aspectRatio: 4 / 5 }}
            >
              <Icon name="heart" size={40} color={ink} />
            </View>
          )}
        </View>
        <View className="flex-row items-start gap-2">
          <Heading size="md" className="min-w-0 flex-1">
            {wish.label}
          </Heading>
          <IconButton icon="pencil" label={copy.piece.editName} onPress={() => setField('label')} />
        </View>
        {wish.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={copy.piece.openShop}
            onPress={() => void Linking.openURL(wish.sourceUrl ?? '')}
            className="min-h-11 justify-center self-start"
          >
            <Text size="small" tone="muted" style={{ textDecorationLine: 'underline' }}>
              {wish.sourceLabel ?? copy.piece.openShop}
            </Text>
          </Pressable>
        ) : null}
        <Tabs items={TABS} value={tab} onChange={setTab} testID="wish-tabs" />
        <RecordRows values={values} onField={setField} only={TAB_OF[tab]} wish />
        {update.isError ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
        <PrimaryScope>
          <View className="gap-3">
            <Button
              loading={promote.isPending}
              onPress={() => promote.mutate({ params: { id: wish.id } })}
              testID="wish-bought"
            >
              {copy.wishlist.bought}
            </Button>
            <Button
              variant="quiet"
              onPress={() => {
                remove.mutate({ params: { id: wish.id } });
                router.back();
              }}
              testID="wish-remove"
            >
              {copy.piece.removeWish}
            </Button>
          </View>
        </PrimaryScope>
      </ScrollView>
      <PieceFieldSheet
        piece={values}
        field={field}
        onClose={() => setField(null)}
        onSave={(input) => update.mutate({ params: { id: wish.id }, input: wishInput(input) })}
        saving={update.isPending}
      />
    </View>
  );
}
