'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import type { Look, Piece, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  fileEdits,
  type RowChanges,
  readDraft,
  rowChanges,
  withTagDefaults,
} from '@robes/core/add-flow';
import { captureEyebrow, type RackRow } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/web';
import { Button, ErrorText, Image, Subview, Tabs, Text } from '@robes/ui';
import { type ReactNode, useState } from 'react';
import { CropThumb } from '@/components/photo-pieces/photo-frame';
import { CardRow } from '@/components/wardrobe/piece-card';
import { type PieceField, PieceFieldSheet } from '@/components/wardrobe/piece-field-sheet';
import { PieceRow, RecordRows, type RecordTab } from '@/components/wardrobe/piece-rows';
import type { CaptureRack } from '@/lib/capture-rack';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';
import { DashedCard } from './rack-card';

const copy = lookbook.draftLook.capture;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const quiet = `min-h-11 self-center font-sans text-ink-faint text-xs underline underline-offset-[3px] hover:text-ink ${focus}`;

// Her photograph's address: its renditions, else the file in hand while they are made.
const photoSrc = (look: Look): string | null =>
  look.photo
    ? (imageSources(look.photo.renditions)?.src ?? localPreview(look.photo.assetId) ?? null)
    : null;

const sheetOf = (row: Pick<RackRow, 'category' | 'categoryL2'>) =>
  (row.categoryL2 && sheetL1For(row.categoryL2)) || row.category;

// A found row's action: a 32px cream disc in a 44px target, its name on a dark pill above it on
// hover and focus (the canvas's tooltips; touch reads the label through the control itself).
function RowDisc({
  icon,
  label,
  faint = false,
  onClick,
  testId,
}: {
  icon: IconName;
  label: string;
  faint?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      data-testid={testId}
      className={`group relative flex h-11 w-[38px] items-center justify-center rounded-pill ${focus}`}
    >
      <span
        className={`flex size-8 items-center justify-center rounded-pill bg-surface-sunk ${faint ? 'text-ink-faint' : 'text-ink'}`}
      >
        <Icon name={icon} size={14} />
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-0.5 hidden -translate-x-1/2 whitespace-nowrap rounded-pill bg-ink px-2.5 py-1.5 font-sans text-[11px] text-bg group-hover:block group-focus-visible:block"
      >
        {label}
      </span>
    </button>
  );
}

// The Rack's heading on a look from her photograph: the serif title, and what Robes is doing.
function Head({ status }: { status?: string }) {
  return (
    <div className="flex h-7 items-center gap-2">
      <h2 className="flex-1 font-display font-normal text-[17px] text-ink-faint tracking-[0.01em]">
        {lookbook.draftLook.rack}
      </h2>
      {status ? (
        <span role="status" className="font-sans text-ink-faint text-xs">
          {status}
        </span>
      ) : null}
    </div>
  );
}

// A piece found in her photograph, not filed yet (Capture PRD 1c.6): the shared piece row with
// the crop, CATEGORY · COLOUR · MATERIAL, the name, and Match to piece · Add piece · Remove. When
// Robes sees one of hers in it, "Looks like your …" sits under a hairline with its one-tap Match;
// otherwise the row says there is no close match. Native twin: features/looks/CaptureRack.tsx.
export function CaptureRow({
  row,
  look,
  capture,
  onMatch,
  onAdd,
}: {
  row: RackRow;
  look: Look;
  capture: CaptureRack;
  onMatch: () => void;
  onAdd: () => void;
}) {
  const crop = look.captureImages[row.key];
  const sources = crop ? imageSources(crop.renditions) : null;
  const read = capture.found(row);
  const photo = photoSrc(look);
  const hers = capture.suggested(row);
  const hersImage = hers?.image ? imageSources(hers.image.renditions) : null;
  const [, ...said] = captureEyebrow(row, '').split(' · ').filter(Boolean);
  return (
    <li data-testid={`capture-row-${row.key}`}>
      <CardRow
        piece={{
          label: row.name,
          category: row.category,
          categoryL2: row.categoryL2 ?? null,
          brand: null,
        }}
        {...(said.length ? { role: said.join(' · ') } : {})}
        maker={hers ? '' : copy.row.noMatch}
        thumb={
          sources ? (
            <Image src={sources.src} srcSet={sources.srcSet} sizes="52px" alt="" aspect="4:5" />
          ) : read && photo ? (
            <CropThumb src={photo} box={read.box} natural={null} className="size-full" />
          ) : (
            <div aria-hidden className="flex aspect-[4/5] items-center justify-center">
              <Text size="small" tone="muted">
                {row.name.charAt(0)}
              </Text>
            </div>
          )
        }
        action={
          <div className="-mr-1.5 flex items-center">
            <RowDisc
              icon="wardrobe"
              label={copy.row.match}
              onClick={onMatch}
              testId="capture-match"
            />
            <RowDisc icon="plus" label={copy.row.add} onClick={onAdd} testId="capture-add" />
            <RowDisc
              icon="close"
              label={copy.row.remove}
              faint
              onClick={() => capture.remove(row.key)}
              testId="capture-remove"
            />
          </div>
        }
        below={
          hers ? (
            <div className="flex items-center gap-2.5">
              <span className="h-[35px] w-7 shrink-0 overflow-hidden rounded-[2px] bg-surface-sunk">
                {hersImage ? (
                  <Image
                    src={hersImage.src}
                    srcSet={hersImage.srcSet}
                    sizes="28px"
                    alt=""
                    aspect="4:5"
                  />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-sans text-[10.5px] text-ink-faint">{copy.row.looksLike}</span>
                <span className="truncate font-sans text-[12.5px] text-ink">{hers.label}</span>
              </span>
              <span className="-mr-1.5">
                <RowDisc
                  icon="check"
                  label={copy.row.quick}
                  onClick={() => capture.match(row.key, hers, 'suggested')}
                  testId="capture-quick-match"
                />
              </span>
            </div>
          ) : null
        }
      />
    </li>
  );
}

// "2 pieces removed · Undo" under the list: Undo puts every removed row back (1c.6).
export function RemovedLine({ capture }: { capture: CaptureRack }) {
  if (!capture.removed) return null;
  return (
    <p className="flex items-center justify-center gap-2 font-sans text-ink-faint text-xs">
      <span role="status">{copy.removed(capture.removed)}</span>
      <button
        type="button"
        onClick={capture.undo}
        data-testid="capture-undo"
        className={`min-h-11 text-ink-muted underline underline-offset-[3px] hover:text-ink ${focus}`}
      >
        {copy.undo}
      </button>
    </p>
  );
}

// The Pieces tab of a look from her photograph (Capture PRD 1c.3–1c.6; canvas 1c): the dashed
// Find the pieces card with "Skip, keep just the photo", the skeleton rows while Robes reads, the
// rack once it has, and the photo kept when there is nothing left on it. `children` are the rows.
export function CapturePieces({
  look,
  capture,
  children,
}: {
  look: Look;
  capture: CaptureRack;
  children: ReactNode;
}) {
  const { stage } = capture;
  const photo = photoSrc(look);
  const card = (sub: string) => (
    <DashedCard
      eyebrow={copy.card.eyebrow}
      title={copy.card.title}
      sub={sub}
      icon="forward"
      photo={photo}
      onClick={capture.find}
      testId="capture-find"
    />
  );
  return (
    <div className="flex flex-col gap-2.5 pt-2" data-testid="capture-rack" data-stage={stage}>
      <Head {...(stage === 'finding' ? { status: copy.finding } : {})} />
      {stage === 'ask' ? (
        <>
          {card(copy.card.sub)}
          <button type="button" onClick={capture.skip} data-testid="capture-skip" className={quiet}>
            {copy.card.skip}
          </button>
        </>
      ) : null}
      {stage === 'photo' ? card(copy.card.later) : null}
      {stage === 'finding' ? (
        <div aria-hidden className="flex flex-col gap-2.5">
          {['w-[58%]', 'w-[44%]', 'w-[52%]'].map((w, i) => (
            <div
              key={w}
              style={{ animationDelay: `${i * 180}ms` }}
              className="flex h-[65px] items-center gap-3 overflow-hidden rounded-[3px] bg-surface-raised shadow-row motion-safe:animate-breathe"
            >
              <span className="h-full w-[52px] shrink-0 bg-surface-sunk" />
              <span className="flex flex-1 flex-col gap-[9px]">
                <span className="h-[7px] w-11 rounded-[2px] bg-surface-sunk" />
                <span className={`h-[11px] rounded-[2px] bg-surface-sunk ${w}`} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {stage === 'failed' ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <ErrorText>{capture.nothing ? copy.nothing : copy.failed}</ErrorText>
            <Button variant="outline" onClick={capture.find} data-testid="capture-retry">
              {copy.retry}
            </Button>
          </div>
          {card(copy.card.later)}
        </>
      ) : null}
      {stage === 'rack' ? <ul className="flex flex-col gap-2.5">{children}</ul> : null}
      {stage === 'clear' ? (
        <p className="rounded-card border-[0.5px] border-rule-mid bg-surface-raised px-5 py-[18px] font-sans text-[13px] text-ink-muted leading-normal">
          {copy.clear}
        </p>
      ) : null}
      <RemovedLine capture={capture} />
    </div>
  );
}

const TABS = [
  wardrobe.piece.tabs.piece,
  wardrobe.piece.tabs.colour,
  wardrobe.piece.tabs.wearing,
] as const;
type TabLabel = (typeof TABS)[number];
const TAB_OF: Record<TabLabel, RecordTab> = {
  [wardrobe.piece.tabs.piece]: 'piece',
  [wardrobe.piece.tabs.colour]: 'colour',
  [wardrobe.piece.tabs.wearing]: 'wearing',
};

// The new-piece review (Capture PRD 1c.8): the found piece on its own page before it files — its
// crop, then PIECE · COLOUR · WEARING as the piece page draws them, every value Robes' read and
// hers to change. ADD TO WARDROBE files it once with her edits and hands the piece back to the
// rack. Native twin: features/looks/CaptureRack.tsx NewPieceSheet.
export function NewPieceSheet({
  row,
  look,
  capture,
  onClose,
  onAdded,
}: {
  // The found row being added; null closes the sheet.
  row: RackRow | null;
  look: Look;
  capture: CaptureRack;
  onClose: () => void;
  onAdded: (piece: Piece) => void;
}) {
  const api = useApiClient();
  const read = row?.proposal?.capture ?? null;
  // The read's own words for the piece: held from this sitting, else read back from its job.
  const held = row ? capture.found(row) : undefined;
  const job = useApi(
    'jobs.get',
    { params: { id: read?.readId ?? '' } },
    { enabled: read !== null && !held },
  );
  const piece: ReadPiece | undefined =
    held ?? job.data?.output.readPieces?.find((p) => p.index === read?.index);
  const [tab, setTab] = useState<TabLabel>(TABS[0]);
  const [field, setField] = useState<PieceField | null>(null);
  const [changes, setChanges] = useState<RowChanges>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new row starts clean.
  const [seen, setSeen] = useState<string | null>(null);
  if ((row?.key ?? null) !== seen) {
    setSeen(row?.key ?? null);
    setTab(TABS[0]);
    setChanges({});
    setError(null);
  }
  const base: PieceValues | null = piece
    ? ({ ...readDraft(piece), category: piece.category } as PieceValues)
    : null;
  const values = base ? withTagDefaults({ ...base, ...changes } as PieceValues) : null;
  const crop = row ? look.captureImages[row.key] : undefined;
  const sources = crop ? imageSources(crop.renditions) : null;
  const photo = photoSrc(look);
  const gone = read !== null && !held && job.isError;

  const add = async () => {
    if (!read || !values || adding) return;
    setAdding(true);
    setError(null);
    try {
      const filed = await api.call('photoReads.piece', {
        params: { id: read.readId },
        input: {
          index: read.index,
          edits: fileEdits(values.label, {
            ...changes,
            // What she wears it for is offered from the category; she files what she sees.
            ...(values.wearFor.length ? { wearFor: [...values.wearFor] } : {}),
          }),
        },
      });
      onAdded(filed);
      onClose();
    } catch {
      setError(copy.review.failed);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Subview
      open={row !== null}
      title={values?.label ?? row?.name ?? ''}
      onBack={onClose}
      testId="capture-new-piece"
      footer={
        <Button
          variant="primary"
          block
          disabled={!values || adding}
          aria-busy={adding}
          onClick={() => void add()}
          data-testid="capture-add-to-wardrobe"
        >
          {adding ? copy.review.adding : copy.review.cta}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="-mx-5 -mt-5 flex aspect-[4/5] items-center justify-center overflow-hidden bg-surface-raised">
          {sources ? (
            <Image
              src={sources.src}
              srcSet={sources.srcSet}
              sizes="(min-width: 768px) 420px, 100vw"
              alt=""
              aspect="4:5"
              className="object-contain"
            />
          ) : piece && photo ? (
            <CropThumb src={photo} box={piece.box} natural={null} className="size-full" />
          ) : null}
        </div>
        <Tabs items={TABS} value={tab} onChange={setTab} label={wardrobe.piece.sections.piece} />
        {values ? (
          <RecordRows
            values={values}
            onField={setField}
            withName
            only={TAB_OF[tab]}
            wearing={
              <>
                <PieceRow label={wardrobe.piece.rows.worn} value={wardrobe.card.new} />
                <PieceRow
                  label={wardrobe.piece.rows.inLooks}
                  value={lookbook.savedLook.details.none}
                />
              </>
            }
          />
        ) : gone ? (
          <ErrorText>{copy.review.gone}</ErrorText>
        ) : (
          <RecordRows
            values={
              {
                ...readDraft({
                  label: row?.name ?? '',
                  brand: null,
                  notes: null,
                  categoryL2: null,
                  categoryL3: null,
                  color: null,
                }),
                category: row ? sheetOf(row) : null,
              } as PieceValues
            }
            onField={setField}
            withName
            only={TAB_OF[tab]}
            reading
          />
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </div>
      {values ? (
        <PieceFieldSheet
          piece={values}
          field={field}
          onClose={() => setField(null)}
          onSave={(input: UpdatePieceInput) => setChanges((c) => ({ ...c, ...rowChanges(input) }))}
          saving={false}
        />
      ) : null}
    </Subview>
  );
}
