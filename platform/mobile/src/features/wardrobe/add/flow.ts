import type { ApiClient } from '@robes/api-client';
import { type AddDestination, isDestination } from '@robes/core/add-flow';
import * as ImagePicker from 'expo-image-picker';
import type { Href } from 'expo-router';
import { PICKER_OPTIONS, type PickedPhoto, uploadPhoto } from '../add-pieces';

// Add a piece, end to end (design "Add Piece — Handoff"): every way in carries where the pieces
// go, and every photo becomes a read Review walks through. Web twin: app/src/lib/add-flow.ts.

export type { AddDestination };

// Photos one Review takes at once: each is its own read, and reads are rate-limited (20/min).
export const REVIEW_MAX = 12;

export function destinationOf(raw: unknown): AddDestination {
  return isDestination(raw) ? raw : 'wardrobe';
}

// A photo on its way to Review: the local frame (for the crop) and, once started, its read.
export interface ReviewShot {
  uri: string;
  width: number;
  height: number;
  jobId?: string;
}

export type ReviewParams =
  | { to: AddDestination; shots: ReviewShot[]; from: 'camera' | 'roll' }
  | { to: AddDestination; link: string };

// Review's address. Shots ride as one JSON param: local file URIs, never anything of hers that
// lives on the server.
export function reviewHref(p: ReviewParams): Href {
  return 'link' in p
    ? { pathname: '/wardrobe/review', params: { to: p.to, link: p.link } }
    : {
        pathname: '/wardrobe/review',
        params: { to: p.to, from: p.from, shots: JSON.stringify(p.shots) },
      };
}

export function parseShots(raw: unknown): ReviewShot[] {
  if (typeof raw !== 'string') return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (s): s is ReviewShot =>
          !!s &&
          typeof s.uri === 'string' &&
          typeof s.width === 'number' &&
          typeof s.height === 'number' &&
          (s.jobId === undefined || typeof s.jobId === 'string'),
      )
      .slice(0, REVIEW_MAX);
  } catch {
    return [];
  }
}

// One photo → presigned upload → its read job (Robes counts what's in the frame).
export async function startRead(api: ApiClient, photo: PickedPhoto): Promise<string> {
  const assetId = await uploadPhoto(api, photo);
  const read = await api.call('photoReads.start', { input: { assetId } });
  return read.jobId;
}

// The camera roll: several at once, in the order she picked them.
export async function pickFromRoll(): Promise<ReviewShot[] | 'denied' | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: REVIEW_MAX,
  });
  if (result.canceled) return null;
  return result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

export function wardrobeHref(to: AddDestination): Href {
  return to === 'wishlist' ? '/wardrobe?segment=wishlist' : '/wardrobe';
}
