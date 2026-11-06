'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, lookFacts, noteShort, pinnedFor } from '@robes/core/looks';
import { Button, Dialog, Eyebrow, Heading, InlineTitleField, Text } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { type Adjust, useAdjust } from '@/lib/adjust';
import { useLookEditor } from '@/lib/look-editor';
import { useLetGo, useRequestFrame, useSaveLook } from '@/lib/look-states';
import { AdjustDock } from './adjust-dock';
import { LookImage } from './look-image';
import { LookVerdict } from './look-verdict';
import { RackRowCard } from './rack-row';
import { RobesModelBadge } from './robes-model-badge';
import { Scanning, scanningLine } from './scan-line';
import { SwapSheet } from './swap-sheet';

// Robes' frame (drawn when she first reaches a suggestion, UX-09) or her look's picture.
export function LookPicture({ look }: { look: Look }) {
  const requestFrame = useRequestFrame();
  const asked = useRef(false);
  useEffect(() => {
    if (!look.image && look.setId && !look.framePending && !asked.current) {
      asked.current = true;
      requestFrame(look.id);
    }
  }, [look, requestFrame]);
  // The frame is scanned while it is drawn, so the page never rests on the bare pieces.
  const busy = scanningLine(look);
  return (
    <figure className="relative overflow-hidden rounded-crisp">
      <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
      {busy ? <Scanning line={busy} corner /> : null}
    </figure>
  );
}

// The text block over a look's picture (Front Door design 3b, plan 2026-11-03 §1.3): what the look
// is made of — hers, and the pieces to find — with Robes' hand named when it composed the look.
// The native twin is mobile/src/features/looks/LookPicture.tsx LookMix.
export function LookMix({
  yours,
  toFind,
  composed,
}: {
  yours: number;
  toFind: number;
  composed: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.2em]">
      <span>{copy.mix(yours, toFind)}</span>
      {composed ? <span>{copy.composedByRobes}</span> : null}
    </div>
  );
}

function eyebrowOf(look: Look): string {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  if (look.status === 'suggested') {
    return around
      ? copy.eyebrow.suggestedAround(around)
      : look.setId
        ? copy.eyebrow.suggestedPrompt
        : copy.eyebrow.suggested;
  }
  return look.setId ? copy.eyebrow.draftFromSuggestion : copy.eyebrow.draft;
}

type Editor = ReturnType<typeof useLookEditor>;

// The rack, read like the wardrobe; editable rows swap, remove and add through the drawer. A
// suggested look's rows swap in place (↻, no Edit) and stay suggested.
export function Rack({
  look,
  editor,
  editable,
  swapInPlace = false,
}: {
  look: Look;
  editor: Editor;
  editable: boolean;
  swapInPlace?: boolean;
}) {
  const [swapping, setSwapping] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const swapRow = editor.rack.rows.find((r) => r.key === swapping) ?? null;
  return (
    <section aria-labelledby="look-rack" className="flex flex-col gap-3">
      <h2
        id="look-rack"
        className="font-sans text-[11px] text-ink-faint uppercase tracking-[0.22em]"
      >
        {copy.rack.title(editor.rack.rows.length)}
      </h2>
      {editor.rack.rows.length === 0 ? (
        editable ? (
          <div className="flex flex-col gap-1 rounded-soft border border-dashed border-border-control p-4">
            <Text className="font-display text-xl">{copy.guide.title}</Text>
            <Text size="small" tone="muted">
              {copy.guide.body}
            </Text>
            <Text size="small" tone="faint">
              {copy.guide.hint}
            </Text>
          </div>
        ) : (
          <Text tone="muted">{copy.rack.empty}</Text>
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {editor.rack.rows.map((row) => (
            <RackRowCard
              key={row.key}
              row={row}
              image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
              mark={editor.mark(row.key)}
              styled={editor.rack.styling[row.key]}
              {...(look.status === 'saved' && !editable && row.pieceId
                ? { wears: piecesById.get(row.pieceId)?.wearCount ?? 0 }
                : {})}
              {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
              {...(editable
                ? { onSwap: () => setSwapping(row.key), onRemove: () => editor.remove(row.key) }
                : swapInPlace
                  ? { onSwap: () => setSwapping(row.key) }
                  : {})}
            />
          ))}
        </ul>
      )}
      {editable ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="min-h-13 rounded-soft border border-dashed border-border-control text-sm text-ink-muted hover:text-ink focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {copy.rack.addPiece}
        </button>
      ) : null}
      <SwapSheet
        open={swapping !== null || adding}
        swapping={swapRow ? { name: swapRow.name, category: swapRow.category } : null}
        onRack={editor.rack.rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
        onClose={() => {
          setSwapping(null);
          setAdding(false);
        }}
        // A suggestion's ↻ and a saved look's swap land on one tap, each behind an Undo.
        instant={swapInPlace || look.status === 'saved'}
        onPick={(piece) =>
          swapping
            ? swapInPlace
              ? editor.swapKeep(swapping, piece)
              : editor.swap(swapping, piece)
            : editor.add(piece)
        }
      />
    </section>
  );
}

// Suggested (F8) and draft (F9 / 4d): one page, one bar.
export function WorkingLook({ look, onSaved }: { look: Look; onSaved: (look: Look) => void }) {
  const router = useRouter();
  const adjustRef = useRef<Adjust | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, look.status === 'suggested' ? 'suggested' : 'draft');
  adjustRef.current = adjust;
  const save = useSaveLook(onSaved, look.status === 'suggested' ? 'suggested' : 'draft');
  const letGo = useLetGo(look.status === 'draft' ? copy.discarded : copy.removed);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const suggested = look.status === 'suggested';
  const hasAny = editor.rack.rows.length > 0 || look.image !== null;
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;
  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-40 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {look.image || look.setId ? (
        <div className="flex flex-col gap-3">
          <LookMix
            yours={editor.rack.rows.filter((r) => r.pieceId).length}
            toFind={editor.rack.rows.filter((r) => r.proposal).length}
            composed={look.composedByRobes}
          />
          <div className="relative">
            <LookPicture look={look} />
            <RobesModelBadge look={look} />
          </div>
        </div>
      ) : (
        <div aria-hidden />
      )}
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <Eyebrow>{eyebrowOf(look)}</Eyebrow>
          {suggested ? (
            <Heading level={1} size="xl">
              {look.name}
            </Heading>
          ) : (
            // The title is the name, as in the composer: tap it and write over it.
            <InlineTitleField
              value={name}
              label={copy.name.label}
              placeholder={look.name || copy.name.placeholder}
              size="xl"
              autoFocus={false}
              onChange={setName}
              onCommit={() => {
                if (typed) editor.rename(typed);
              }}
              onCancel={() => setName(look.nameProvisional ? '' : look.name)}
            />
          )}
        </header>
        {look.note ? (
          <Text className="font-display text-[17px] text-ink-muted italic">
            {noteShort(look.note)}
          </Text>
        ) : null}
        <Rack look={look} editor={editor} editable={!suggested} swapInPlace={suggested} />
        {editor.rack.rows.length > 0 ? <AdjustDock adjust={adjust} name={look.name} /> : null}
        {suggested ? (
          <>
            <LookVerdict
              look={look}
              onLetGo={() => {
                letGo(look.id);
                router.push('/looks?tab=suggested');
              }}
            />
            <Button
              variant="quiet"
              className="self-start"
              onClick={() => {
                letGo(look.id);
                router.push('/looks?tab=suggested');
              }}
            >
              {copy.bar.notForYou}
            </Button>
          </>
        ) : null}
      </div>
      <Dialog
        open={editor.full !== null}
        onOpenChange={(o) => {
          if (!o) editor.keep();
        }}
        title={copy.drafts.fullTitle}
        description={copy.drafts.fullBody(editor.full?.oldest ?? copy.draftTile.untitled)}
        footer={
          <>
            <Button variant="quiet" onClick={editor.keep}>
              {copy.drafts.keep}
            </Button>
            <Button variant="primary" onClick={editor.letGo}>
              {copy.drafts.letGo}
            </Button>
          </>
        }
      />
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:sticky md:bottom-0 md:col-span-2 md:rounded-soft md:border"
        data-testid="look-bar"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {suggested ? (
            <Button variant="outline" onClick={editor.startDraft} loading={editor.saving}>
              {copy.bar.edit}
            </Button>
          ) : (
            <Button
              variant="quiet"
              onClick={() => {
                letGo(look.id);
                router.push('/looks');
              }}
            >
              {copy.bar.discard}
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!hasAny}
            loading={save.isPending}
            onClick={() =>
              save.mutate({ params: { id: look.id }, input: typed ? { name: typed } : {} })
            }
          >
            {suggested ? copy.bar.saveToLookbook : copy.bar.save}
          </Button>
        </div>
      </div>
    </article>
  );
}

// The saved look's rack, Editing and its thread (5a–5e; plan 2026-11-03 D6): her words edit the
// rack at once, the picture falls behind, and ↻ Update look commits the rack and draws it again.
export function SavedRack({
  look,
  editor,
  adjust,
}: {
  look: Look;
  editor: Editor;
  adjust: Adjust;
}) {
  return (
    <>
      <Rack look={look} editor={editor} editable={editor.editing} />
      {editor.rack.rows.length > 0 ? <AdjustDock adjust={adjust} name={look.name} /> : null}
      {/* The look's one bar, held at the foot: Edit look, or Done and Update while she works.
          Fixed above the tab bar on a phone, at the foot of the window on the web. */}
      <div
        // The look is a pushed view on a phone, so nothing sits under the bar.
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        data-testid="look-bar"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-4 py-3">
          {editor.editing ? (
            <>
              <Button variant="quiet" onClick={editor.discard}>
                {editor.dirty ? copy.bar.discard : copy.bar.done}
              </Button>
              <Button
                variant="primary"
                disabled={!editor.dirty && !adjust.stale}
                loading={editor.saving}
                onClick={() =>
                  void editor.update().then((ok) => {
                    if (ok) adjust.drawForSave();
                  })
                }
              >
                {adjust.stale ? `↻ ${copy.bar.update}` : copy.bar.update}
              </Button>
            </>
          ) : (
            // Beta's size and case: a small hairline pill in sentence case (its hit area stays 44).
            <button
              type="button"
              onClick={editor.startEditing}
              className="relative min-h-9 rounded-pill border border-border-control px-4 font-sans text-ink text-sm after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] hover:border-ink focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              {look.pieces.length || look.proposals.length ? copy.bar.editLook : copy.bar.addPieces}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// The native twin builds the same line in LookDetail.tsx.
export function savedMeta(look: Look, rows: number, today: string): string {
  return copy.meta.saved({ ...lookFacts(look, rows), pinnedFor: pinnedFor(look.pinnedOn, today) });
}
