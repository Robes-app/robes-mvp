import type { Db } from '../client';
import { adminRepo } from './admin';
import { assetProcessingRepo, assetsRepo } from './assets';
import { flagsRepo } from './flags';
import { jobRunnerRepo, jobsRepo } from './jobs';
import { ledgerRepo } from './ledger';
import { maintenanceRepo } from './maintenance';
import { pieceAnalysisRepo } from './piece-analysis';
import { profilesRepo } from './profiles';
import { usageRepo } from './usage';
import { wardrobeRepo } from './wardrobe';

// User-scoped repositories: every method takes the verified UserId first (CLAUDE.md rule 7).
export function createRepositories(db: Db) {
  return {
    admin: adminRepo(db),
    assets: assetsRepo(db),
    flags: flagsRepo(db),
    jobs: jobsRepo(db),
    // Global capacity check only; holds no per-user data.
    capacity: { isExhausted: ledgerRepo(db).isExhausted },
    profiles: profilesRepo(db),
    usage: usageRepo(db),
    wardrobe: wardrobeRepo(db),
  };
}

// System repositories for workers; addressed by record id, never exposed to route handlers.
export function createSystemRepositories(db: Db) {
  return {
    assets: assetProcessingRepo(db),
    jobs: jobRunnerRepo(db),
    ledger: ledgerRepo(db),
    maintenance: maintenanceRepo(db),
    pieces: pieceAnalysisRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type SystemRepositories = ReturnType<typeof createSystemRepositories>;
export type { AssetKind } from './assets';
export type { CreateJobInput } from './jobs';
export type { CallRecord } from './ledger';
export type { PieceAnalysis } from './piece-analysis';
export { EDITABLE_PROFILE_FIELDS, type ProfilePatch } from './profiles';
export { encodeCursor, type ListPiecesQuery, type PieceFields } from './wardrobe';
