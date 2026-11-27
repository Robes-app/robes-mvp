'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe as copy, lookbook } from '@robes/copy';
import { shopName } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Skeleton, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { PieceHeader } from '@/components/wardrobe/piece-header';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { PieceRow } from '@/components/wardrobe/piece-rows';
import { errorCopy } from '@/lib/error-copy';
import { useRefreshLooks } from '@/lib/look-states';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// A piece Robes picked for a look, before it is on her wishlist (Annie, 24 Nov): the wish's page
// read from the look — its name, photograph, category, brand, price and shop link — with Add to
// wishlist as its one button. Nothing is stored until she adds it; it is then filed as Save files
// it (looks.proposals.wish) and opens as her wish. One already filed opens as the wish. A piece
// found in her photograph opens here too, with its crop and no button (Annie, 27 Nov). Native
// twin: mobile/src/features/looks/ProposalDetail.tsx.
export function ProposalDetail({ lookId, pieceKey }: { lookId: string; pieceKey: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const refresh = useRefreshLooks();
  const { track } = useAnalytics().analytics;
  const query = useApi('looks.get', { params: { id: lookId } });
  const look = query.data;
  const proposal = look?.proposals.find((p) => p.key === pieceKey);
  const wishId = proposal?.wishlistItemId ?? null;
  useEffect(() => {
    if (wishId) router.replace(`/wardrobe/wishlist/${wishId}`);
  }, [wishId, router]);
  const wish = useApiMutation('looks.proposals.wish', {
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.call('looks.get', { params: { id: lookId } }), updated);
      refresh(updated);
    },
  });
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  if (!look) {
    return (
      <div aria-busy className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Skeleton className="aspect-[4/5]" />
        <Skeleton shape="text" className="h-10 w-2/3" />
      </div>
    );
  }
  if (!proposal) return <Text tone="muted">{lookbook.pieceToFind.gone}</Text>;
  // A piece found in her photograph shows its crop, and is filed from its row on the look (the
  // heart, or the hanger's sheet): `looks.proposals.wish` files only what Robes picked.
  const found = proposal.capture !== null;
  const image = look.proposalImages?.[pieceKey] ?? look.captureImages[pieceKey] ?? null;
  const shop = proposal.retailerHint || shopName(proposal.url);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col lg:max-w-none">
      <PieceHeader title={proposal.name} back={`/look/${lookId}`} />
      <article
        className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[clamp(360px,38%,560px)_minmax(0,1fr)] lg:items-start lg:gap-14"
        data-testid="proposal-detail"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <div className="relative -mx-5 overflow-hidden bg-surface-raised md:mx-0 md:rounded-soft md:border md:border-hairline">
            {image ? (
              <PieceImage
                piece={{ label: proposal.name, image }}
                contain
                sizes="(min-width: 1024px) 560px, (min-width: 768px) 576px, 100vw"
                priority
              />
            ) : (
              <div aria-hidden className="flex aspect-[4/5] items-center justify-center">
                <Icon name="heart" size={40} className="text-ink" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <PieceRow label={copy.piece.rows.category} value={proposal.category} />
            {proposal.brand ? <PieceRow label={copy.piece.brand} value={proposal.brand} /> : null}
            {proposal.pricePoint ? (
              <PieceRow label={copy.piece.rows.price} value={proposal.pricePoint} />
            ) : null}
            {shop ? <PieceRow label={copy.piece.rows.shop} value={shop} /> : null}
          </div>
          {proposal.url ? (
            <a
              href={proposal.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('shop_opened', { from: 'piece_to_find' })}
              className={`self-start font-sans text-ink-muted text-sm underline underline-offset-4 hover:text-ink ${focus}`}
            >
              {copy.piece.openShop}
            </a>
          ) : null}
        </div>
        {found ? null : (
          <div className="flex min-w-0 flex-col gap-3">
            {wish.isError ? <ErrorText>{errorCopy(wish.error)}</ErrorText> : null}
            <Button
              variant="primary"
              block
              loading={wish.isPending || wishId !== null}
              onClick={() => wish.mutate({ params: { id: lookId, key: pieceKey }, input: {} })}
              data-testid="proposal-wish"
            >
              <Icon name="heart" size={13} />
              {lookbook.pieceToFind.add}
            </Button>
          </div>
        )}
      </article>
    </div>
  );
}
