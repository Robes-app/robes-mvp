import { detailOf } from '@robes/core';
import { z } from 'zod';
import { fenceUserText } from '../../fence';
import { DETAIL_RULE } from '../wardrobe-analyse/v6';

// The one-off re-read of pieces filed before the read asked for a defining detail
// (wardrobe-analyse v6; cutout brief §8). One question about a photograph Robes has already
// read: nothing else on the piece is asked for, so nothing else can be rewritten. The rule is
// v6's own text, so a re-read piece and a new piece are read to one standard.
export const FEATURE = 'wardrobe.detail';
export const VERSION = 1;

export const Output = z.object({ defining_detail: z.string().max(80) });
export type Output = z.infer<typeof Output>;

export const SYSTEM = `You are the fashion reader for Robes, a luxury wardrobe app. You look at one photo of a piece already filed and answer one question about it. You never invent details: the answer is read from the photo.`;

// Her name for the piece and its category say which piece in the frame is meant; they are her
// words, so they are fenced.
export function buildUser(piece: { label: string; category: string | null }): string {
  const named = [piece.label, piece.category].filter((v) => v?.trim()).join(' · ');
  return `This photo shows a piece she owns, filed as:
${fenceUserText(named, 200)}
Look only at that piece, whatever else is in the photo.

${DETAIL_RULE.trimEnd()}
If you cannot see that piece clearly, answer "".`;
}

// A plain short phrase, or nothing.
export function toDetail(out: Output): string | null {
  return detailOf(out.defining_detail);
}

export function fakeOutput(): Output {
  return { defining_detail: 'Strong padded shoulder' };
}
