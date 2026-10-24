import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece, UpdatePieceInput } from '@robes/contracts';
import { wardrobe as copy, lookbook } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { type PieceColour, pattern, shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  PrimaryScope,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SuggestedRail } from '@/features/looks/SuggestedRail';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { colourSummary, ShadeSwatch } from './ColourField';
import { type PieceField, PieceFieldSheet } from './PieceFieldSheet';
import { PieceRow, PieceSection } from './PieceRows';
import { READING_REFRESH_MS, useDeletePiece } from './pieces';

const colourOf = (p: Piece): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});
const colourText = (p: Piece): string | null => colourSummary(colourOf(p)) || p.color;

const money = (price: number | null, currency: string | null): string | null =>
  price === null
    ? null
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency ?? 'EUR',
        maximumFractionDigits: 0,
      }).format(price);

// The record (legacy Piece_Sheet 01): the photograph, her name for it with the pencil on it, the
// facts she has given, then the days she wore it. Every fact is a row that opens its own drawer —
// there is no form, so what the title says and what a row says can never disagree.
export function PieceDetail({ id, saw = false }: { id: string; saw?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [field, setField] = useState<PieceField | null>(null);
  const {
    data: piece,
    isPending,
    isError,
    error,
  } = useApi(
    'wardrobe.get',
    { params: { id } },
    { refetchInterval: (q) => (q.state.data?.status === 'reading' ? READING_REFRESH_MS : false) },
  );
  const remove = useDeletePiece();
  const update = useApiMutation('wardrobe.update', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id: saved.id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
  });

  if (isPending) {
    return (
      <View className="gap-4 px-6">
        <Skeleton width="100%" aspectRatio={4 / 5} />
        <Skeleton shape="text" width="60%" height={28} />
      </View>
    );
  }
  if (isError || !piece) return <EmptyState title={errorMessage(error)} />;

  const uri = renditionUri(piece.image, 400);
  const reading = piece.status === 'reading';
  const ready = piece.status === 'ready';
  const mainShade = shade(piece.colourShade);
  const extras = piece.colourExtra
    .map((x) => shade(x)?.name)
    .filter(Boolean)
    .join(' · ');
  const save = (input: UpdatePieceInput) => update.mutate({ params: { id: piece.id }, input });
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-5 px-6 pb-10">
        {uri ? (
          <Image source={uri} alt={copy.photoAlt(piece.label)} blurhash={piece.image?.blurhash} />
        ) : null}
        <View className="gap-1.5">
          <View className="flex-row items-start gap-2">
            {/* Until Robes has read it, "New piece" is a placeholder, not a fact. */}
            {ready ? (
              <Heading size="md" className="min-w-0 flex-1">
                {piece.label}
              </Heading>
            ) : (
              <Text tone="faint" italic accessibilityRole="header" className="flex-1">
                {reading ? copy.newPiece : piece.label}
              </Text>
            )}
            {/* The pencil edits the name where it is written, never a field further down. */}
            <IconButton
              icon="pencil"
              label={copy.piece.editName}
              onPress={() => setField('label')}
            />
          </View>
          {/* The brand is its own line, and says so when it is missing — one source, the piece. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={piece.brand ?? copy.piece.addBrand}
            onPress={() => setField('brand')}
          >
            <Text tone="muted" italic>
              {piece.brand ?? copy.piece.addBrand}
            </Text>
          </Pressable>
          {reading ? <Text tone="muted">{copy.reading}</Text> : null}
          {piece.status === 'failed' ? <ErrorText>{copy.noPieceFound}</ErrorText> : null}
        </View>
        {saw && piece.status !== 'failed' ? <Saw piece={piece} /> : null}

        {ready ? (
          <View className="flex-row overflow-hidden rounded-crisp border border-hairline bg-surface">
            <View className="flex-1 gap-1 p-3">
              <Eyebrow>{copy.piece.stats.worn}</Eyebrow>
              <Text size="small">
                {piece.wearCount ? copy.card.worn(piece.wearCount) : copy.piece.stats.never}
              </Text>
            </View>
          </View>
        ) : null}

        <PrimaryScope>
          <View className="gap-3">
            <Button
              icon="looks"
              disabled={reading}
              onPress={() =>
                router.push({ pathname: '/looks/style', params: { pieceId: piece.id } })
              }
            >
              {copy.piece.stylePiece}
            </Button>
            <Button
              variant="secondary"
              disabled={reading}
              onPress={() => router.push({ pathname: '/looks/new', params: { pieceId: piece.id } })}
            >
              {lookbook.startLook}
            </Button>
          </View>
        </PrimaryScope>

        <PieceSection title={copy.piece.sections.piece}>
          <PieceRow
            first
            label={copy.piece.rows.category}
            value={[piece.categoryL2 ?? piece.category, piece.categoryL3]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => setField('category')}
          />
          <PieceRow
            label={copy.piece.brand}
            value={piece.brand}
            onPress={() => setField('brand')}
          />
        </PieceSection>

        <PieceSection title={copy.piece.sections.colour}>
          <PieceRow
            first
            label={copy.piece.rows.colour}
            value={mainShade?.name ?? null}
            swatch={mainShade ? <ShadeSwatch shade={mainShade} size={18} /> : undefined}
            check={piece.colourCheck ? copy.colour.check : undefined}
            onPress={() => setField('colour')}
          />
          <PieceRow
            label={copy.piece.rows.extra}
            value={extras}
            onPress={() => setField('extra')}
          />
          <PieceRow
            label={copy.piece.rows.print}
            value={pattern(piece.print)?.name ?? copy.colour.plain}
            onPress={() => setField('print')}
          />
          <PieceRow
            label={copy.piece.rows.material}
            value={material(piece.material)?.name ?? null}
            check={piece.materialCheck ? copy.material.check : undefined}
            onPress={() => setField('material')}
          />
        </PieceSection>

        <PieceSection title={copy.piece.sections.wearing}>
          <PieceRow
            first
            label={copy.piece.rows.season}
            value={copy.filter.seasons[piece.seasonBand]}
            onPress={() => setField('season')}
          />
          <PieceRow
            label={copy.piece.rows.wearFor}
            value={piece.wearFor.join(' · ')}
            onPress={() => setField('wearFor')}
          />
        </PieceSection>

        <PieceSection title={copy.piece.sections.fit}>
          <PieceRow
            first
            label={copy.piece.rows.size}
            value={piece.size}
            onPress={() => setField('size')}
          />
          <PieceRow
            label={copy.piece.rows.price}
            value={money(piece.price, piece.currency)}
            onPress={() => setField('price')}
          />
          <PieceRow
            label={copy.piece.rows.notes}
            note={piece.notes}
            onPress={() => setField('notes')}
          />
        </PieceSection>

        <Wears pieceId={piece.id} />
        <SuggestedRail pieceId={piece.id} />
        {update.isError ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}

        <Button
          variant="quiet"
          icon="trash"
          className="self-center"
          onPress={() => {
            remove.mutate({ params: { id: piece.id } });
            router.back();
          }}
        >
          {copy.piece.remove}
        </Button>
      </ScrollView>
      <PieceFieldSheet
        piece={piece}
        field={field}
        onClose={() => setField(null)}
        onSave={save}
        saving={update.isPending}
      />
    </View>
  );
}

// The piece's own record: the days it was on her, and the look she wore it in.
function Wears({ pieceId }: { pieceId: string }) {
  const router = useRouter();
  const faint = useColor('ink-faint');
  const query = useApi('wardrobe.wears', { params: { id: pieceId } });
  const items = query.data?.items ?? [];
  const undated = query.data?.undated ?? 0;
  if (query.isPending) return <Skeleton shape="text" width="60%" />;
  return (
    <View className="gap-2">
      <Eyebrow>{copy.piece.sections.wears}</Eyebrow>
      {items.length === 0 && !undated ? (
        <Text size="small" tone="muted" italic>
          {copy.piece.wears.none}
        </Text>
      ) : (
        <>
          <View className="overflow-hidden rounded-crisp border border-hairline bg-surface">
            {items.map((wear, i) => (
              <Pressable
                key={wear.id}
                accessibilityRole="link"
                accessibilityLabel={copy.piece.wears.openDay(longDate(wear.wornOn))}
                onPress={() => router.push(`/day/${wear.wornOn}`)}
                className={`flex-row items-center gap-3 px-4 py-3 ${i ? 'border-hairline border-t' : ''}`}
              >
                <Text size="small">{dayMonth(wear.wornOn)}</Text>
                <Text size="caption" tone="faint" italic numberOfLines={1} className="flex-1">
                  {wear.lookName ?? ''}
                </Text>
                <Icon name="forward" size={15} color={faint} />
              </Pressable>
            ))}
          </View>
          {undated ? (
            <Text size="caption" tone="faint" italic>
              {copy.piece.wears.undated(undated)}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

// Beta's reveal: what Robes filed, row by row, once it has read the piece.
function Saw({ piece }: { piece: Piece }) {
  const router = useRouter();
  const rows: [string, string | null][] = [
    [copy.saw.rows.piece, piece.label],
    [copy.saw.rows.category, [piece.category, piece.categoryL2].filter(Boolean).join(' · ')],
    [copy.saw.rows.colour, colourText(piece)],
    [copy.saw.rows.brand, piece.brand],
  ];
  return (
    <View className="gap-3">
      <Heading size="md">{copy.saw.title}</Heading>
      {piece.status === 'ready' ? (
        <>
          <View className="border-hairline border-t">
            {rows.map(([k, v]) => (
              <View key={k} className="flex-row items-baseline gap-3 border-hairline border-b py-2">
                <Eyebrow className="flex-1">{k}</Eyebrow>
                <Text size="small" tone={v ? 'ink' : 'faint'} italic={!v}>
                  {v || copy.saw.unread}
                </Text>
              </View>
            ))}
          </View>
          <Button variant="secondary" onPress={() => router.replace('/wardrobe')}>
            {copy.saw.keep}
          </Button>
        </>
      ) : (
        <Text size="small" tone="muted" italic accessibilityLiveRegion="polite">
          {copy.saw.reading}
        </Text>
      )}
    </View>
  );
}
