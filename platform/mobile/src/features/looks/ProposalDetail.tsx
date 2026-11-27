import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe as copy, lookbook } from '@robes/copy';
import { shopName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { Button, ErrorText, Image, PrimaryScope, Skeleton, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { PieceHeader } from '@/features/wardrobe/PieceHeader';
import { PieceRow } from '@/features/wardrobe/PieceRows';
import { nativeAnalytics } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import { cutoutUri, renditionUri } from '@/lib/images';
import { useInvalidateLooks } from './look-states';

// A piece Robes picked for a look, before it is on her wishlist (Annie, 24 Nov): the wish's page
// read from the look — its name, photograph, category, brand, price and shop link — with Add to
// wishlist as its one button. Nothing is stored until she adds it; it is then filed as Save files
// it (looks.proposals.wish) and opens as her wish. One already filed opens as the wish. A piece
// found in her photograph opens here too, with its crop and no button (Annie, 27 Nov). Web twin:
// app/src/components/looks/proposal-detail.tsx.
export function ProposalDetail({ lookId, pieceKey }: { lookId: string; pieceKey: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useInvalidateLooks();
  const ink = useColor('ink');
  const query = useApi('looks.get', { params: { id: lookId } });
  const look = query.data;
  const proposal = look?.proposals.find((p) => p.key === pieceKey);
  const wishId = proposal?.wishlistItemId ?? null;
  useEffect(() => {
    if (wishId) router.replace({ pathname: '/wish/[id]', params: { id: wishId } });
  }, [wishId, router]);
  const wish = useApiMutation('looks.proposals.wish', {
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: lookId } }), updated);
      refresh(updated);
    },
  });
  if (query.isError) return <ErrorText>{errorMessage(query.error)}</ErrorText>;
  if (!look) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (!proposal) {
    return (
      <View className="flex-1">
        <PieceHeader title="" />
        <Text tone="muted" className="px-5">
          {lookbook.pieceToFind.gone}
        </Text>
      </View>
    );
  }
  // A piece found in her photograph shows its crop, and is filed from its row on the look (the
  // heart, or the hanger's sheet): `looks.proposals.wish` files only what Robes picked.
  const found = proposal.capture !== null;
  const image = look.proposalImages?.[pieceKey] ?? look.captureImages[pieceKey] ?? null;
  const cutout = cutoutUri(image);
  const uri = cutout ?? renditionUri(image, 400);
  const rows = [
    { label: copy.piece.rows.category, value: proposal.category },
    { label: copy.piece.brand, value: proposal.brand },
    { label: copy.piece.rows.price, value: proposal.pricePoint },
    { label: copy.piece.rows.shop, value: proposal.retailerHint || shopName(proposal.url) },
  ].filter((r) => r.value);
  return (
    <View className="flex-1" testID="proposal-detail">
      <PieceHeader title={proposal.name} />
      <ScrollView contentContainerClassName="gap-5 pb-10">
        <View className="bg-surface-raised">
          {uri ? (
            <Image
              source={uri}
              alt={copy.photoAlt(proposal.name)}
              blurhash={cutout ? null : image?.blurhash}
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
        <View className="gap-5 px-5">
          <View>
            {rows.map((r, i) => (
              <PieceRow key={r.label} first={i === 0} label={r.label} value={r.value} />
            ))}
          </View>
          {proposal.url ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={copy.piece.openShop}
              onPress={() => {
                nativeAnalytics.track('shop_opened', { from: 'piece_to_find' });
                void Linking.openURL(proposal.url ?? '');
              }}
              className="min-h-11 justify-center self-start"
            >
              <Text size="small" tone="muted" style={{ textDecorationLine: 'underline' }}>
                {copy.piece.openShop}
              </Text>
            </Pressable>
          ) : null}
          {wish.isError ? <ErrorText>{errorMessage(wish.error)}</ErrorText> : null}
          {found ? null : (
            <PrimaryScope>
              <Button
                icon="heart"
                loading={wish.isPending || wishId !== null}
                onPress={() => wish.mutate({ params: { id: lookId, key: pieceKey }, input: {} })}
                testID="proposal-wish"
              >
                {lookbook.pieceToFind.add}
              </Button>
            </PrimaryScope>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
