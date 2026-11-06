// A look's image stack while she works it (plan 2026-11-06 D19, D20): Robes' picture (unless she
// hid it) and her photographs, then the ones she has just added. Nothing here is written until
// Update look; the stage is what she has done since. Shared by both clients' ImageManager.

export type StageCard =
  | { kind: 'robes' }
  | { kind: 'photo'; id: string }
  | { kind: 'added'; assetId: string };

export interface ImageStage {
  // Uploaded since she opened the look, in the order she added them (asset ids).
  added: string[];
  // Her photographs taken out (look image ids).
  removed: string[];
  // Robes' picture hidden (true) or brought back (false); null leaves it as the look has it.
  robesHidden: boolean | null;
  // The card she left in front; null keeps the look's cover.
  front: StageCard | null;
}

export const EMPTY_STAGE: ImageStage = { added: [], removed: [], robesHidden: null, front: null };

// What the look holds as saved: whether Robes has drawn a picture, whether she hid it, her
// photographs in order, and which card is the cover.
export interface StackBase {
  robes: boolean;
  robesHidden: boolean;
  photos: string[];
  cover: StageCard;
}

export function sameCard(a: StageCard, b: StageCard): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'photo' && b.kind === 'photo') return a.id === b.id;
  if (a.kind === 'added' && b.kind === 'added') return a.assetId === b.assetId;
  return true;
}

export function stageCards(base: StackBase, stage: ImageStage): StageCard[] {
  const hidden = stage.robesHidden ?? base.robesHidden;
  return [
    ...(base.robes && !hidden ? [{ kind: 'robes' } as const] : []),
    ...base.photos
      .filter((id) => !stage.removed.includes(id))
      .map((id) => ({ kind: 'photo', id }) as const),
    ...stage.added.map((assetId) => ({ kind: 'added', assetId }) as const),
  ];
}

// The card in front: the one she left there if it is still in the stack, else the look's cover,
// else the first card.
export function stageFront(base: StackBase, stage: ImageStage): StageCard | null {
  const cards = stageCards(base, stage);
  for (const want of [stage.front, base.cover]) {
    if (want && cards.some((c) => sameCard(c, want))) return want;
  }
  return cards[0] ?? null;
}

// A look always keeps one image: the last card has no ×.
export function canRemoveCard(base: StackBase, stage: ImageStage): boolean {
  return stageCards(base, stage).length > 1;
}

// A photograph she picks lands in the frame, in focus, and in front.
export function stageAdd(stage: ImageStage, assetId: string): ImageStage {
  return {
    ...stage,
    added: [...stage.added, assetId],
    front: { kind: 'added', assetId },
  };
}

export function stageRemove(base: StackBase, stage: ImageStage, card: StageCard): ImageStage {
  if (!canRemoveCard(base, stage)) return stage;
  const next: ImageStage =
    card.kind === 'robes'
      ? { ...stage, robesHidden: true }
      : card.kind === 'photo'
        ? { ...stage, removed: [...stage.removed, card.id] }
        : { ...stage, added: stage.added.filter((a) => a !== card.assetId) };
  return stage.front && sameCard(stage.front, card) ? { ...next, front: null } : next;
}

export function stageInFront(stage: ImageStage, card: StageCard): ImageStage {
  return { ...stage, front: card };
}

// Anything waiting for Update look.
export function stageChanged(base: StackBase, stage: ImageStage): boolean {
  if (stage.added.length > 0 || stage.removed.length > 0) return true;
  if (stage.robesHidden !== null && stage.robesHidden !== base.robesHidden) return true;
  const front = stageFront(base, stage);
  return front !== null && !sameCard(front, base.cover);
}
