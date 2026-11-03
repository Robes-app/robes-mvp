import { type LookRole, orderRack, type RackRow, type RackState } from '@robes/core/looks';
import type { Look, LookAskInput, LookAskResult, Proposal, UpdateLookInput } from './looks';
import type { Piece } from './wardrobe';

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
  return {
    pieces: state.rows.flatMap((r) => (r.pieceId ? [{ pieceId: r.pieceId, role: r.role }] : [])),
    // Categories the prompt names freely are folded by the contract (Proposal.category.catch).
    proposals: state.rows.flatMap((r) =>
      r.proposal ? [{ ...r.proposal, role: r.role ?? r.proposal.role }] : [],
    ) as UpdateLookInput['proposals'],
    styling,
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
// proposals by their words, the anchor kept.
export function askRack(state: RackState, anchorPieceId: string | null): LookAskInput['rack'] {
  return state.rows.map((r) => ({
    key: r.key,
    pieceId: r.pieceId,
    proposal: r.proposal
      ? { name: r.proposal.name, category: r.proposal.category, brand: r.proposal.brand }
      : null,
    keep: r.pieceId !== null && r.pieceId === anchorPieceId,
    was: state.edits[r.key]?.was?.name ?? null,
    styled: state.styling[r.key] ?? null,
  })) as LookAskInput['rack'];
}

// True when an answer changes the rack (and so a suggestion becomes a draft).
export function askChanges(
  result: Pick<LookAskResult, 'swaps' | 'back' | 'backAll' | 'styled'>,
): boolean {
  return (
    result.swaps.length > 0 || result.back.length > 0 || result.backAll || result.styled.length > 0
  );
}
