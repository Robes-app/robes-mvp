export const USAGE_METRICS = [
  'generation.text',
  'generation.image',
  'analyse.photo',
  'inbox.receipt',
  'upload.image',
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export type QuotaPeriod = 'day' | 'month';

export interface PlanLimit {
  period: QuotaPeriod;
  limit: number;
}

export const PLAN_IDS = ['beta', 'free', 'plus'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

// OD-6 default: generous beta quotas behind the global breaker; M8 sets real tiers.
export const PLAN_LIMITS: Record<PlanId, Record<UsageMetric, PlanLimit>> = {
  beta: {
    'generation.text': { period: 'day', limit: 60 },
    'generation.image': { period: 'day', limit: 120 },
    'analyse.photo': { period: 'day', limit: 200 },
    'inbox.receipt': { period: 'day', limit: 50 },
    'upload.image': { period: 'day', limit: 300 },
  },
  free: {
    'generation.text': { period: 'day', limit: 20 },
    'generation.image': { period: 'day', limit: 30 },
    'analyse.photo': { period: 'day', limit: 60 },
    'inbox.receipt': { period: 'day', limit: 20 },
    'upload.image': { period: 'day', limit: 100 },
  },
  plus: {
    'generation.text': { period: 'day', limit: 200 },
    'generation.image': { period: 'day', limit: 400 },
    'analyse.photo': { period: 'day', limit: 600 },
    'inbox.receipt': { period: 'day', limit: 200 },
    'upload.image': { period: 'day', limit: 1000 },
  },
};

export const DEFAULT_PLAN: PlanId = 'beta';
