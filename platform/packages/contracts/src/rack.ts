import {
  type LookRole,
  newProposalKey,
  orderRack,
  type RackRow,
  type RackState,
} from '@robes/core/looks';
import type { Look, LookAskInput, LookAskResult, Proposal, UpdateLookInput } from './looks';
import type { Piece, Wish } from './wardrobe';

// A look's rack as the clients edit it: her pieces then the proposals, in the formula's order,
// with how each is worn and a draft's working notes. Shared so web and native map it the same.

export function pieceRow(
  piece: Pick<Piece, 'id' | 'label' | 'category' | 'categoryL2' | 'brand'>,
  role: LookRole | null,
): RackRow {
  return {
    key: piece.id,
    pieceId: piece.id,
    name: piece.label,
    category: piece.category,
    categoryL2: piece.categoryL2,
    brand: piece.brand,
    role,
    proposal: null,
  };
}

// A wish from the Add Pieces picker's WISHLIST tab (Front Door PRD rev 3 §4.6): on the rack as a
// proposal that already reads Wishlist, its price along; the look then carries a piece to find.
export function wishRow(
  wish: Pick<
    Wish,
    'id' | 'label' | 'category' | 'color' | 'brand' | 'sourceLabel' | 'price' | 'currency'
  >,
  key: string = newProposalKey(),
): RackRow {
  const pricePoint =
    wish.price !== null && wish.price > 0
      ? `${wish.currency === 'GBP' ? '£' : wish.currency === 'USD' ? '$' : '€'}${wish.price}`
      : '';
  return proposalRow({
    key,
    name: wish.label,
    category: wish.category,
    color: wish.color ?? '',
    brand: wish.brand ?? '',
    retailerHint: wish.sourceLabel ?? '',
    pricePoint: pricePoint.slice(0, 20),
    role: null,
    wishlisted: true,
    wishlistItemId: wish.id,
    capture: null,
  });
}

// A swap for a wish (the picker's WISHLIST tab in a swap, Annie 16 Nov): the wish takes the row's
// place and role as a piece to find, and the row remembers what it was ("Swapped in · was …"), as
// a swap for one of her pieces does in applyAsk. A row not on the rack changes nothing.
export function swapForWish(
  rack: RackState,
  key: string,
  wish: Parameters<typeof wishRow>[0],
): RackState {
  const at = rack.rows.findIndex((r) => r.key === key);
  const cur = rack.rows[at];
  if (!cur) return rack;
  const made = wishRow(wish);
  const next: RackRow = {
    ...made,
    role: cur.role,
    proposal: made.proposal ? { ...made.proposal, role: cur.role } : null,
  };
  const { [key]: prior, ...edits } = rack.edits;
  const { [key]: _styled, ...styling } = rack.styling;
  const rows = rack.rows.map((r, i) => (i === at ? next : r));
  return { ...rack, rows, edits: { ...edits, [next.key]: { was: prior?.was ?? cur } }, styling };
}

export function proposalRow(p: Proposal): RackRow {
  return {
    key: p.key,
    pieceId: null,
    name: p.name,
    category: p.category,
    brand: p.brand || null,
    role: p.role,
    proposal: p,
  };
}

export function rackFromLook(
  look: Pick<Look, 'pieces' | 'proposals' | 'styling' | 'edits'>,
): RackState {
  return {
    rows: orderRack([
      ...look.pieces.map((p) => pieceRow(p.piece, p.role)),
      ...look.proposals.map(proposalRow),
    ]),
    edits: look.edits as RackState['edits'],
    styling: look.styling,
  };
}

// What PATCH /looks/:id takes for this rack; `edits` only while it is a draft.
export function rackUpdate(state: RackState, opts: { keepEdits: boolean }): UpdateLookInput {
  const keys = new Set(state.rows.map((r) => r.key));
  const styling = Object.fromEntries(Object.entries(state.styling).filter(([k]) => keys.has(k)));
  const filed = state.rows.flatMap((r) =>
    r.filedFrom ? [{ from: r.filedFrom, to: r.pieceId ?? r.key }] : [],
  );
  return {
    pieces: state.rows.flatMap((r) => (r.pieceId ? [{ pieceId: r.pieceId, role: r.role }] : [])),
    // Categories the prompt names freely are folded by the contract (Proposal.category.catch).
    proposals: state.rows.flatMap((r) =>
      r.proposal ? [{ ...r.proposal, role: r.role ?? r.proposal.role }] : [],
    ) as UpdateLookInput['proposals'],
    styling,
    ...(filed.length > 0 ? { filed } : {}),
    ...(opts.keepEdits
      ? {
          edits: Object.fromEntries(
            Object.entries(state.edits).filter(([k]) => keys.has(k)),
          ) as UpdateLookInput['edits'],
        }
      : {}),
  };
}

// The rack as the look prompt reads it: her pieces by id (named from her wardrobe server-side),
// proposals by their words, the anchor kept (her piece, or the wish the draft started from).
export function askRack(state: RackState, anchorPieceId: string | null): LookAskInput['rack'] {
  return state.rows.map((r) => ({
    key: r.key,
    pieceId: r.pieceId,
    proposal: r.proposal
      ? { name: r.proposal.name, category: r.proposal.category, brand: r.proposal.brand }
      : null,
    keep: (r.pieceId !== null && r.pieceId === anchorPieceId) || r.proposal?.anchor === true,
    was: state.edits[r.key]?.was?.name ?? null,
    styled: state.styling[r.key] ?? null,
  })) as LookAskInput['rack'];
}

// True when an answer changes the rack (and so a suggestion becomes a draft).
export function askChanges(
  result: Pick<LookAskResult, 'swaps' | 'back' | 'backAll' | 'styled'> &
    Partial<Pick<LookAskResult, 'adds'>>,
): boolean {
  return (
    result.swaps.length > 0 ||
    (result.adds?.length ?? 0) > 0 ||
    result.back.length > 0 ||
    result.backAll ||
    result.styled.length > 0
  );
}
