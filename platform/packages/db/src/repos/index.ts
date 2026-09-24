import type { Db } from '../client';
import { adminRepo } from './admin';
import { assetProcessingRepo, assetsRepo } from './assets';
import { flagsRepo } from './flags';
import { jobRunnerRepo, jobsRepo } from './jobs';
import { profilesRepo } from './profiles';
import { usageRepo } from './usage';

// User-scoped repositories: every method takes the verified UserId first (CLAUDE.md rule 7).
export function createRepositories(db: Db) {
  return {
    admin: adminRepo(db),
    assets: assetsRepo(db),
    flags: flagsRepo(db),
    jobs: jobsRepo(db),
    profiles: profilesRepo(db),
    usage: usageRepo(db),
  };
}

// System repositories for workers; addressed by record id, never exposed to route handlers.
export function createSystemRepositories(db: Db) {
  return {
    assets: assetProcessingRepo(db),
    jobs: jobRunnerRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type SystemRepositories = ReturnType<typeof createSystemRepositories>;
export type { AssetKind } from './assets';
export {
  type CreateJobInput,
  JOB_KINDS,
  type JobKind,
  type JobStage,
  type JobStatus,
} from './jobs';
export { EDITABLE_PROFILE_FIELDS, type ProfilePatch } from './profiles';
