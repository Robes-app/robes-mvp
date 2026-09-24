import type { z } from 'zod';
import { EmptyInput, HealthOutput } from './common';
import { JOB_EVENT, JobIdParams, JobSnapshot, StartJobOutput } from './jobs';
import { Me, OnboardingComplete, UpdateMeInput } from './me';
import { Asset, AssetParams, CreateUploadInput, CreateUploadOutput, MediaSession } from './media';

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
