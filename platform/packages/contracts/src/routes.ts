import type { z } from 'zod';
import { EmptyInput, HealthOutput } from './common';
import { Consents, UpdateConsentsInput } from './consents';
import { JOB_EVENT, JobIdParams, JobSnapshot, StartJobOutput } from './jobs';
import {
  CreateLookInput,
  GenerateLookInput,
  Idea,
  IdeaList,
  IdeaParams,
  ListIdeasInput,
  ListLooksInput,
  Look,
  LookPage,
  LookParams,
  UpdateLookInput,
  Wear,
  WearInput,
  WearParams,
} from './looks';
import {
  AnalyseStyleInput,
  DeletionRequest,
  DeletionStatus,
  Me,
  OnboardingComplete,
  RequestDeletionInput,
  StyleOverrides,
  StyleProfile,
  UpdateMeInput,
} from './me';
import { Asset, AssetParams, CreateUploadInput, CreateUploadOutput, MediaSession } from './media';
import {
  GetPlanInput,
  PinLookInput,
  PinnedEntries,
  Plan,
  PlanEntry,
  PlanEntryParams,
  UpdatePlanEntryInput,
} from './plan';
import {
  BatchPiecesInput,
  BatchPiecesOutput,
  CreatePieceInput,
  CreateWishInput,
  Deleted,
  ListPiecesInput,
  ListWishesInput,
  Piece,
  PiecePage,
  PieceParams,
  UpdatePieceInput,
  UpdateWishInput,
  Wish,
  WishPage,
  WishParams,
} from './wardrobe';

export const API_BASE_PATH = '/api/v1';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type RouteAuth = 'public' | 'user' | 'admin';

export interface JsonRouteDef {
  method: HttpMethod;
  // Relative to API_BASE_PATH; `:name` segments are filled from `params`.
  path: `/${string}`;
  auth: RouteAuth;
  params?: z.ZodType;
  // Query string for GET/DELETE, JSON body otherwise.
  input: z.ZodType;
  output: z.ZodType;
  // Creating/spending POSTs: clients send an Idempotency-Key (docs/api.md §2).
  idempotent?: true;
  sse?: never;
}

export interface SseRouteDef {
  method: 'GET';
  path: `/${string}`;
  auth: Exclude<RouteAuth, 'public'>;
  params?: z.ZodType;
  sse: true;
  // Event name → payload schema of its `data`.
  events: Record<string, z.ZodType>;
}

export type RouteDef = JsonRouteDef | SseRouteDef;

// One entry per /api/v1 handler; route-contract.test.ts keeps this and the route.ts files in sync.
export const routes = {
  'health.get': {
    method: 'GET',
    path: '/health',
    auth: 'public',
    input: EmptyInput,
    output: HealthOutput,
  },
  'me.get': { method: 'GET', path: '/me', auth: 'user', input: EmptyInput, output: Me },
  'me.update': { method: 'PATCH', path: '/me', auth: 'user', input: UpdateMeInput, output: Me },
  'me.onboarding.complete': {
    method: 'POST',
    path: '/me/onboarding/complete',
    auth: 'user',
    input: EmptyInput,
    output: OnboardingComplete,
  },
  'me.deletion.get': {
    method: 'GET',
    path: '/me/deletion',
    auth: 'user',
    input: EmptyInput,
    output: DeletionStatus,
  },
  // Naturally idempotent: a repeat request returns the first one.
  'me.deletion.request': {
    method: 'POST',
    path: '/me/deletion',
    auth: 'user',
    input: RequestDeletionInput,
    output: DeletionRequest,
  },
  'me.style.get': {
    method: 'GET',
    path: '/me/style',
    auth: 'user',
    input: EmptyInput,
    output: StyleProfile,
  },
  'me.style.analyse': {
    method: 'POST',
    path: '/me/style/analyse',
    auth: 'user',
    input: AnalyseStyleInput,
    output: StartJobOutput,
    idempotent: true,
  },
  'me.style.overrides': {
    method: 'PATCH',
    path: '/me/style/overrides',
    auth: 'user',
    input: StyleOverrides,
    output: StyleProfile,
  },
  'me.consents.get': {
    method: 'GET',
    path: '/me/consents',
    auth: 'user',
    input: EmptyInput,
    output: Consents,
  },
  'me.consents.update': {
    method: 'POST',
    path: '/me/consents',
    auth: 'user',
    input: UpdateConsentsInput,
    output: Consents,
  },
  'wardrobe.list': {
    method: 'GET',
    path: '/wardrobe/items',
    auth: 'user',
    input: ListPiecesInput,
    output: PiecePage,
  },
  'wardrobe.create': {
    method: 'POST',
    path: '/wardrobe/items',
    auth: 'user',
    input: CreatePieceInput,
    output: Piece,
  },
  'wardrobe.get': {
    method: 'GET',
    path: '/wardrobe/items/:id',
    auth: 'user',
    params: PieceParams,
    input: EmptyInput,
    output: Piece,
  },
  'wardrobe.update': {
    method: 'PATCH',
    path: '/wardrobe/items/:id',
    auth: 'user',
    params: PieceParams,
    input: UpdatePieceInput,
    output: Piece,
  },
  'wardrobe.delete': {
    method: 'DELETE',
    path: '/wardrobe/items/:id',
    auth: 'user',
    params: PieceParams,
    input: EmptyInput,
    output: Deleted,
  },
  'wardrobe.restore': {
    method: 'POST',
    path: '/wardrobe/items/:id/restore',
    auth: 'user',
    params: PieceParams,
    input: EmptyInput,
    output: Piece,
  },
  // Naturally idempotent: re-sending the same photos returns the pieces already made.
  'wardrobe.batch': {
    method: 'POST',
    path: '/wardrobe/items/batch',
    auth: 'user',
    input: BatchPiecesInput,
    output: BatchPiecesOutput,
  },
  'wishlist.list': {
    method: 'GET',
    path: '/wishlist/items',
    auth: 'user',
    input: ListWishesInput,
    output: WishPage,
  },
  'wishlist.create': {
    method: 'POST',
    path: '/wishlist/items',
    auth: 'user',
    input: CreateWishInput,
    output: Wish,
  },
  'wishlist.get': {
    method: 'GET',
    path: '/wishlist/items/:id',
    auth: 'user',
    params: WishParams,
    input: EmptyInput,
    output: Wish,
  },
  'wishlist.update': {
    method: 'PATCH',
    path: '/wishlist/items/:id',
    auth: 'user',
    params: WishParams,
    input: UpdateWishInput,
    output: Wish,
  },
  'wishlist.delete': {
    method: 'DELETE',
    path: '/wishlist/items/:id',
    auth: 'user',
    params: WishParams,
    input: EmptyInput,
    output: Deleted,
  },
  'wishlist.restore': {
    method: 'POST',
    path: '/wishlist/items/:id/restore',
    auth: 'user',
    params: WishParams,
    input: EmptyInput,
    output: Wish,
  },
  // "I bought this": naturally idempotent — a promoted wish is gone, so a repeat is a 404.
  'wishlist.promote': {
    method: 'POST',
    path: '/wishlist/items/:id/promote',
    auth: 'user',
    params: WishParams,
    input: EmptyInput,
    output: Piece,
  },
  'looks.list': {
    method: 'GET',
    path: '/looks',
    auth: 'user',
    input: ListLooksInput,
    output: LookPage,
  },
  'looks.create': {
    method: 'POST',
    path: '/looks',
    auth: 'user',
    input: CreateLookInput,
    output: Look,
  },
  'looks.get': {
    method: 'GET',
    path: '/looks/:id',
    auth: 'user',
    params: LookParams,
    input: EmptyInput,
    output: Look,
  },
  'looks.update': {
    method: 'PATCH',
    path: '/looks/:id',
    auth: 'user',
    params: LookParams,
    input: UpdateLookInput,
    output: Look,
  },
  'looks.delete': {
    method: 'DELETE',
    path: '/looks/:id',
    auth: 'user',
    params: LookParams,
    input: EmptyInput,
    output: Deleted,
  },
  'looks.restore': {
    method: 'POST',
    path: '/looks/:id/restore',
    auth: 'user',
    params: LookParams,
    input: EmptyInput,
    output: Look,
  },
  // "Save as new": a copy with her edits, linked to its origin.
  'looks.variant': {
    method: 'POST',
    path: '/looks/:id/variants',
    auth: 'user',
    params: LookParams,
    input: UpdateLookInput,
    output: Look,
    idempotent: true,
  },
  // Naturally idempotent: one wear per look per day.
  'looks.wear': {
    method: 'POST',
    path: '/looks/:id/wears',
    auth: 'user',
    params: LookParams,
    input: WearInput,
    output: Wear,
  },
  'looks.unwear': {
    method: 'DELETE',
    path: '/looks/:id/wears/:date',
    auth: 'user',
    params: WearParams,
    input: EmptyInput,
    output: Deleted,
  },
  'looks.generate': {
    method: 'POST',
    path: '/looks/generate',
    auth: 'user',
    input: GenerateLookInput,
    output: StartJobOutput,
    idempotent: true,
  },
  'looks.ideas.list': {
    method: 'GET',
    path: '/looks/ideas',
    auth: 'user',
    input: ListIdeasInput,
    output: IdeaList,
  },
  'looks.ideas.get': {
    method: 'GET',
    path: '/looks/ideas/:id',
    auth: 'user',
    params: IdeaParams,
    input: EmptyInput,
    output: Idea,
  },
  'looks.ideas.save': {
    method: 'POST',
    path: '/looks/ideas/:id/save',
    auth: 'user',
    params: IdeaParams,
    input: EmptyInput,
    output: Idea,
  },
  'looks.ideas.delete': {
    method: 'DELETE',
    path: '/looks/ideas/:id',
    auth: 'user',
    params: IdeaParams,
    input: EmptyInput,
    output: Deleted,
  },
  'plan.get': { method: 'GET', path: '/plan', auth: 'user', input: GetPlanInput, output: Plan },
  // Naturally idempotent: a look already on a day and slot keeps its entry.
  'plan.pin': {
    method: 'POST',
    path: '/plan/looks/:id/days',
    auth: 'user',
    params: LookParams,
    input: PinLookInput,
    output: PinnedEntries,
  },
  'plan.update': {
    method: 'PATCH',
    path: '/plan/entries/:id',
    auth: 'user',
    params: PlanEntryParams,
    input: UpdatePlanEntryInput,
    output: PlanEntry,
  },
  'plan.unpin': {
    method: 'DELETE',
    path: '/plan/entries/:id',
    auth: 'user',
    params: PlanEntryParams,
    input: EmptyInput,
    output: Deleted,
  },
  'plan.restore': {
    method: 'POST',
    path: '/plan/entries/:id/restore',
    auth: 'user',
    params: PlanEntryParams,
    input: EmptyInput,
    output: Deleted,
  },
  'jobs.fake': {
    method: 'POST',
    path: '/jobs/fake',
    auth: 'user',
    input: EmptyInput,
    output: StartJobOutput,
    idempotent: true,
  },
  'jobs.get': {
    method: 'GET',
    path: '/jobs/:id',
    auth: 'user',
    params: JobIdParams,
    input: EmptyInput,
    output: JobSnapshot,
  },
  'jobs.cancel': {
    method: 'POST',
    path: '/jobs/:id/cancel',
    auth: 'user',
    params: JobIdParams,
    input: EmptyInput,
    output: JobSnapshot,
  },
  'jobs.events': {
    method: 'GET',
    path: '/jobs/:id/events',
    auth: 'user',
    params: JobIdParams,
    sse: true,
    events: { [JOB_EVENT]: JobSnapshot },
  },
  'uploads.create': {
    method: 'POST',
    path: '/uploads',
    auth: 'user',
    input: CreateUploadInput,
    output: CreateUploadOutput,
    idempotent: true,
  },
  'uploads.complete': {
    method: 'POST',
    path: '/uploads/:id/complete',
    auth: 'user',
    params: AssetParams,
    input: EmptyInput,
    output: Asset,
  },
  'assets.get': {
    method: 'GET',
    path: '/assets/:id',
    auth: 'user',
    params: AssetParams,
    input: EmptyInput,
    output: Asset,
  },
  'media.session': {
    method: 'POST',
    path: '/media/session',
    auth: 'user',
    input: EmptyInput,
    output: MediaSession,
  },
} as const satisfies Record<string, RouteDef>;

export type Routes = typeof routes;
export type RouteKey = keyof Routes;
export type JsonRouteKey = { [K in RouteKey]: Routes[K] extends SseRouteDef ? never : K }[RouteKey];
export type SseRouteKey = Exclude<RouteKey, JsonRouteKey>;
export type QueryRouteKey = {
  [K in JsonRouteKey]: Routes[K]['method'] extends 'GET' ? K : never;
}[JsonRouteKey];
export type MutationRouteKey = Exclude<JsonRouteKey, QueryRouteKey>;
