'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, noteShort } from '@robes/core/looks';
import { Button, Dialog, Eyebrow, Field, Heading, Text } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLookEditor } from '@/lib/look-editor';
import { useLetGo, useRequestFrame, useSaveLook } from '@/lib/look-states';
import { GenericModelBadge } from './generic-model-badge';
import { LookImage } from './look-image';
import { LookPromptBox } from './look-prompt-box';
import { LookVerdict } from './look-verdict';
import { RackRowCard } from './rack-row';
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
  return (
    <figure className="flex flex-col gap-1">
      <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
      <figcaption className="flex justify-end">
        {look.framePending ? (
          <Text size="caption" tone="muted">
            {copy.suggestedTile.restyling}
          </Text>
        ) : look.composedByRobes ? (
          <Text size="caption" tone="faint">
            {copy.composedByRobes}
          </Text>
        ) : null}
      </figcaption>
    </figure>
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
      <Heading level={2} size="sm" id="look-rack">
        {copy.rack.title(editor.rack.rows.length)}
      </Heading>
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
          className="min-h-13 rounded-soft border border-dashed border-border-control text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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
        instant={swapInPlace}
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
  const editor = useLookEditor(look);
  const save = useSaveLook(onSaved);
  const letGo = useLetGo(look.status === 'draft' ? copy.discarded : copy.removed);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const suggested = look.status === 'suggested';
  const hasAny = editor.rack.rows.length > 0 || look.image !== null;
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;
  return (
    <article className="grid gap-8 pb-28 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {look.image || look.setId ? (
        <div className="relative">
          <LookPicture look={look} />
          {suggested && look.frame ? <GenericModelBadge /> : null}
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
            <Field
              label={copy.name.label}
              placeholder={look.name || copy.name.placeholder}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (typed) editor.rename(typed);
              }}
            />
          )}
          <Text size="small" tone="muted">
            {copy.meta.pieces(editor.rack.rows.length)}
          </Text>
        </header>
        {look.note ? <Text>{noteShort(look.note)}</Text> : null}
        <Rack look={look} editor={editor} editable={!suggested} swapInPlace={suggested} />
        {editor.rack.rows.length > 0 ? (
          <LookPromptBox
            lookId={look.id}
            name={look.name}
            surface={suggested ? 'suggested' : 'draft'}
            rack={editor.rack}
            anchorPieceId={look.anchor?.id ?? null}
            changed={editor.changed}
            draft={!suggested}
            onAnswer={editor.answer}
          />
        ) : null}
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
        className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-bg px-4 py-3 md:sticky md:col-span-2 md:rounded-soft md:border"
        data-testid="look-bar"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {suggested ? (
            <Button variant="secondary" onClick={editor.startDraft} loading={editor.saving}>
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

// The saved look's rack, Editing and its prompt (5a–5e).
export function SavedRack({ look, editor }: { look: Look; editor: Editor }) {
  return (
    <>
      <Rack look={look} editor={editor} editable={editor.editing} />
      {editor.rack.rows.length > 0 ? (
        <LookPromptBox
          lookId={look.id}
          name={look.name}
          surface="saved"
          rack={editor.rack}
          anchorPieceId={look.anchor?.id ?? null}
          changed={editor.changed}
          onAnswer={editor.answer}
        />
      ) : null}
      <div
        className="flex items-center justify-end gap-3 border-t border-hairline pt-4"
        data-testid="look-bar"
      >
        {editor.editing ? (
          <>
            <Button variant="quiet" onClick={editor.discard}>
              {editor.dirty ? copy.bar.discard : copy.bar.done}
            </Button>
            <Button
              variant="primary"
              disabled={!editor.dirty}
              loading={editor.saving}
              onClick={editor.update}
            >
              {copy.bar.update}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={editor.startEditing}>
            {look.pieces.length || look.proposals.length ? copy.bar.editLook : copy.bar.addPieces}
          </Button>
        )}
      </div>
    </>
  );
}

export function savedMeta(look: Look, rows: number): string {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  return [
    copy.meta.pieces(rows),
    look.timesWorn ? copy.meta.wears(look.timesWorn) : copy.meta.notYetWorn,
    around ? copy.meta.around(around) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
