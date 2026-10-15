import type { z } from 'zod';
import {
  AdminCosts,
  AdminCostsInput,
  AdminFlag,
  AdminFlagParams,
  AdminFlags,
  AdminHealth,
  AdminUserDetail,
  AdminUserPage,
  AdminUserParams,
  AuditPage,
  ListAdminUsersInput,
  ListAuditInput,
  SetAdminFlagInput,
} from './admin';
import { EmptyInput, HealthOutput } from './common';
import { Consents, UpdateConsentsInput } from './consents';
import {
  DecideInboxInput,
  ImportLinkInput,
  InboxAddress,
  InboxAddressStatus,
  InboxDecision,
  InboxList,
  InboxParams,
} from './inbox';
import { JOB_EVENT, JobIdParams, JobSnapshot, StartJobOutput } from './jobs';
import {
  CreateLookInput,
  GenerateLookInput,
  Idea,
  IdeaFrameParams,
  IdeaList,
  IdeaParams,
  ListIdeasInput,
  ListLooksInput,
  Look,
  LookPage,
  LookParams,
  SaveWayInput,
  UpdateLookInput,
  Wear,
  WearInput,
  WearParams,
} from './looks';
import {
  AnalyseStyleInput,
  DataExport,
  DataExportStatus,
  DeletionRequest,
  DeletionStatus,
  Features,
  Me,
  Model,
  OnboardingComplete,
  PushTokenParams,
  RegisterPushTokenInput,
  RequestDeletionInput,
  StyleOverrides,
  StyleProfile,
  UpdateMeInput,
  UpdateModelInput,
} from './me';
import { Asset, AssetParams, CreateUploadInput, CreateUploadOutput, MediaSession } from './media';
import { JoinWaitlistInput, Ok, OneClickUnsubInput, UnsubParams } from './notify';
import {
  GetPlanInput,
  PinLookInput,
  PinnedEntries,
  Plan,
  PlanEntry,
  PlanEntryParams,
  UpdatePlanEntryInput,
} from './plan';
import { CreateShareInput, Share, SharedLook, ShareParams } from './shares';
import {
  DailyItemParams,
  DailyLook,
  DailyLookParams,
  SaveDailyLookInput,
  Today,
  TodayGenerateInput,
} from './today';
import { PinnedTrip, PlanTripInput, Trip, TripList, TripParams } from './travel';
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
  WardrobeSummary,
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
  'me.features': {
    method: 'GET',
    path: '/me/features',
    auth: 'user',
    input: EmptyInput,
    output: Features,
  },
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
  'me.model.get': {
    method: 'GET',
    path: '/me/model',
    auth: 'user',
    input: EmptyInput,
    output: Model,
  },
  // Files the model she sees and starts drawing its portrait if nobody has yet.
  'me.model.update': {
    method: 'PATCH',
    path: '/me/model',
    auth: 'user',
    input: UpdateModelInput,
    output: Model,
  },
  // "See it on me": naturally idempotent per model and rack.
  'looks.renderOnModel': {
    method: 'POST',
    path: '/looks/:id/render',
    auth: 'user',
    params: LookParams,
    input: EmptyInput,
    output: StartJobOutput,
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
  'me.exports.get': {
    method: 'GET',
    path: '/me/exports',
    auth: 'user',
    input: EmptyInput,
    output: DataExportStatus,
  },
  // Naturally idempotent: a request from the last day is returned instead of a new one.
  'me.exports.request': {
    method: 'POST',
    path: '/me/exports',
    auth: 'user',
    input: EmptyInput,
    output: DataExport,
  },
  // Naturally idempotent: upsert by token.
  'me.pushTokens.register': {
    method: 'PUT',
    path: '/me/push-tokens',
    auth: 'user',
    input: RegisterPushTokenInput,
    output: Ok,
  },
  'me.pushTokens.revoke': {
    method: 'DELETE',
    path: '/me/push-tokens/:token',
    auth: 'user',
    params: PushTokenParams,
    input: EmptyInput,
    output: Deleted,
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
  'wardrobe.summary': {
    method: 'GET',
    path: '/wardrobe/summary',
    auth: 'user',
    input: EmptyInput,
    output: WardrobeSummary,
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
  // Render one deferred frame on demand; naturally idempotent like today.looks.render.
  'looks.ideas.render': {
    method: 'POST',
    path: '/looks/ideas/:id/frames/:idx',
    auth: 'user',
    params: IdeaFrameParams,
    input: EmptyInput,
    output: StartJobOutput,
  },
  'looks.ideas.saveWay': {
    method: 'POST',
    path: '/looks/ideas/:id/looks',
    auth: 'user',
    params: IdeaParams,
    input: SaveWayInput,
    output: Look,
    idempotent: true,
  },
  'looks.ideas.delete': {
    method: 'DELETE',
    path: '/looks/ideas/:id',
    auth: 'user',
    params: IdeaParams,
    input: EmptyInput,
    output: Deleted,
  },
  'today.get': { method: 'GET', path: '/today', auth: 'user', input: EmptyInput, output: Today },
  'today.generate': {
    method: 'POST',
    path: '/today/generate',
    auth: 'user',
    input: TodayGenerateInput,
    output: StartJobOutput,
    idempotent: true,
  },
  'today.looks.get': {
    method: 'GET',
    path: '/today/looks/:id',
    auth: 'user',
    params: DailyLookParams,
    input: EmptyInput,
    output: DailyLook,
  },
  // Render one deferred item frame on demand; naturally idempotent (a ready or rendering frame
  // returns its job instead of spending again).
  'today.looks.render': {
    method: 'POST',
    path: '/today/looks/:id/items/:idx/render',
    auth: 'user',
    params: DailyItemParams,
    input: EmptyInput,
    output: StartJobOutput,
  },
  'today.looks.save': {
    method: 'POST',
    path: '/today/looks/:id/save',
    auth: 'user',
    params: DailyLookParams,
    input: SaveDailyLookInput,
    output: Look,
  },
  'travel.plan': {
    method: 'POST',
    path: '/travel/plan',
    auth: 'user',
    input: PlanTripInput,
    output: StartJobOutput,
    idempotent: true,
  },
  'trips.list': {
    method: 'GET',
    path: '/trips',
    auth: 'user',
    input: EmptyInput,
    output: TripList,
  },
  'trips.get': {
    method: 'GET',
    path: '/trips/:id',
    auth: 'user',
    params: TripParams,
    input: EmptyInput,
    output: Trip,
  },
  // Naturally idempotent: a pinned trip returns the looks it already pinned.
  'trips.pin': {
    method: 'POST',
    path: '/trips/:id/pin',
    auth: 'user',
    params: TripParams,
    input: EmptyInput,
    output: PinnedTrip,
  },
  'trips.delete': {
    method: 'DELETE',
    path: '/trips/:id',
    auth: 'user',
    params: TripParams,
    input: EmptyInput,
    output: Deleted,
  },
  'trips.restore': {
    method: 'POST',
    path: '/trips/:id/restore',
    auth: 'user',
    params: TripParams,
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
  // Naturally idempotent: sharing a look again returns its existing link.
  'shares.create': {
    method: 'POST',
    path: '/shares',
    auth: 'user',
    input: CreateShareInput,
    output: Share,
  },
  'shares.revoke': {
    method: 'DELETE',
    path: '/shares/:token',
    auth: 'user',
    params: ShareParams,
    input: EmptyInput,
    output: Deleted,
  },
  'public.shares.get': {
    method: 'GET',
    path: '/public/shares/:token',
    auth: 'public',
    params: ShareParams,
    input: EmptyInput,
    output: SharedLook,
  },
  'public.waitlist.join': {
    method: 'POST',
    path: '/public/waitlist',
    auth: 'public',
    input: JoinWaitlistInput,
    output: Ok,
  },
  'public.unsub': {
    method: 'POST',
    path: '/public/unsub/:token',
    auth: 'public',
    params: UnsubParams,
    input: OneClickUnsubInput,
    output: Ok,
  },
  'admin.users.list': {
    method: 'GET',
    path: '/admin/users',
    auth: 'admin',
    input: ListAdminUsersInput,
    output: AdminUserPage,
  },
  'admin.users.get': {
    method: 'GET',
    path: '/admin/users/:id',
    auth: 'admin',
    params: AdminUserParams,
    input: EmptyInput,
    output: AdminUserDetail,
  },
  'admin.health': {
    method: 'GET',
    path: '/admin/health',
    auth: 'admin',
    input: EmptyInput,
    output: AdminHealth,
  },
  'admin.costs': {
    method: 'GET',
    path: '/admin/costs',
    auth: 'admin',
    input: AdminCostsInput,
    output: AdminCosts,
  },
  'admin.flags.list': {
    method: 'GET',
    path: '/admin/flags',
    auth: 'admin',
    input: EmptyInput,
    output: AdminFlags,
  },
  'admin.flags.set': {
    method: 'PATCH',
    path: '/admin/flags/:key',
    auth: 'admin',
    params: AdminFlagParams,
    input: SetAdminFlagInput,
    output: AdminFlag,
  },
  'admin.audit': {
    method: 'GET',
    path: '/admin/audit',
    auth: 'admin',
    input: ListAuditInput,
    output: AuditPage,
  },
  'inbox.list': {
    method: 'GET',
    path: '/inbox',
    auth: 'user',
    input: EmptyInput,
    output: InboxList,
  },
  // Naturally idempotent: a decided row isn't decided again.
  'inbox.decide': {
    method: 'POST',
    path: '/inbox/:id/decide',
    auth: 'user',
    params: InboxParams,
    input: DecideInboxInput,
    output: InboxDecision,
  },
  'imports.link': {
    method: 'POST',
    path: '/imports/link',
    auth: 'user',
    input: ImportLinkInput,
    output: StartJobOutput,
    idempotent: true,
  },
  // Minted on first read; naturally idempotent.
  'me.inboxAddress.get': {
    method: 'GET',
    path: '/me/inbox-address',
    auth: 'user',
    input: EmptyInput,
    output: InboxAddress,
  },
  'me.inboxAddress.regenerate': {
    method: 'POST',
    path: '/me/inbox-address/regenerate',
    auth: 'user',
    input: EmptyInput,
    output: InboxAddress,
  },
  'me.inboxAddress.revoke': {
    method: 'DELETE',
    path: '/me/inbox-address',
    auth: 'user',
    input: EmptyInput,
    output: InboxAddressStatus,
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
