import { type AddDestination, isDestination } from '@robes/core/add-flow';

// Where the add flow's pieces go, and its addresses. A plain module (no 'use client'), so the
// server pages (/wardrobe/add, /wardrobe/camera) and nav.ts can call them.

export function destinationOf(raw: unknown): AddDestination {
  return isDestination(raw) ? raw : 'wardrobe';
}

export function wardrobeHref(to: AddDestination): string {
  return to === 'wishlist' ? '/wardrobe/wishlist' : '/wardrobe';
}

// The Add pieces sheet, up over the Wardrobe or the Wishlist (`?add=`); the old /wardrobe/add
// lands here. Twin of native features/wardrobe/add/flow.ts addPiecesHref.
export function addPiecesHref(to: AddDestination): string {
  return `${wardrobeHref(to)}?add=${to}`;
}

// The wardrobe camera and its Review, filing to `to`. Twin of native app/wardrobe/camera.tsx.
export function cameraHref(to: AddDestination): string {
  return `/wardrobe/camera?to=${to}`;
}
