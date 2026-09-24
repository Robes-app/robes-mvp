import { production } from './production';
import { staging } from './staging';
import type { StageConfig, StageName } from './types';

export type { StageConfig, StageName } from './types';

export const stages: Record<StageName, StageConfig> = { staging, production };
