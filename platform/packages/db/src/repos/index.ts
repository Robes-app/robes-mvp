import type { Db } from '../client';
import { adminRepo } from './admin';
import { adminReadsRepo } from './admin-reads';
import { assetProcessingRepo, assetsRepo } from './assets';
import { avatarCellsRepo } from './avatar-cells';
import { consentsRepo } from './consents';
import { dailyLooksRepo } from './daily-looks';
import { accountDeletionRepo, deletionRepo } from './deletion';
import { dataExportRepo, exportsRepo } from './exports';
import { flagsRepo } from './flags';
import { framesRepo } from './frames';
import { ideasRepo } from './ideas';
import { inboxIntakeRepo, inboxRepo } from './inbox';
import { inboxAddressRepo, mintInboxAddress } from './inbox-address';
import { jobRunnerRepo, jobsRepo } from './jobs';
import { ledgerRepo } from './ledger';
import { looksRepo } from './looks';
import { maintenanceRepo } from './maintenance';
import { modelRepo } from './model';
import { modelRenderRepo } from './model-render';
import { notifierRepo } from './notifier';
import { overnightRepo } from './overnight';
import { pieceAnalysisRepo } from './piece-analysis';
import { planRepo } from './plan';
import { profilesRepo } from './profiles';
import { pushDeliveryRepo, pushTokensRepo } from './push-tokens';
import { rateLimitRepo } from './rate-limits';
import { publicSharesRepo, sharesRepo } from './shares';
import { styleBriefRepo, styleDnaRepo, styleMemoryRepo } from './style-dna';
import { styleAnalysisRepo, styleProfileRepo } from './style-profile';
import { stylingRepo } from './styling';
import { noticedRepo, suggestedLooksRepo } from './suggested';
import { tripsRepo } from './trips';
import { usageRepo } from './usage';
import { waitlistRepo } from './waitlist';
import { wardrobeRepo } from './wardrobe';
import { wishlistRepo } from './wishlist';

// User-scoped repositories: every method takes the verified UserId first (CLAUDE.md rule 7).
export function createRepositories(db: Db) {
  return {
    admin: adminRepo(db),
    // Admin-only; every method re-checks the actor and audits (SEC-11).
    adminReads: adminReadsRepo(db),
    assets: assetsRepo(db),
    // The shared model catalog: keyed by picks, holds no user data (SEC-22).
    avatarCells: avatarCellsRepo(db),
    consents: consentsRepo(db),
    dailyLooks: dailyLooksRepo(db),
    deletion: deletionRepo(db),
    exports: exportsRepo(db),
    flags: flagsRepo(db),
    frames: framesRepo(db),
    ideas: ideasRepo(db),
    inbox: inboxRepo(db),
    inboxAddress: inboxAddressRepo(db),
    looks: looksRepo(db),
    // Robes-noticed lines from the look prompt; keeping one into her brief is the memory's.
    noticed: noticedRepo(db),
    model: modelRepo(db),
    jobs: jobsRepo(db),
    // API rate-limit counters (SEC-33); keyed by route + user or IP, no user rows.
    rateLimits: rateLimitRepo(db),
    // Global capacity check only; holds no per-user data.
    capacity: { isExhausted: ledgerRepo(db).isExhausted },
    plan: planRepo(db),
    profiles: profilesRepo(db),
    // Public signups (SEC-60): insert-only for callers; confirmation by signed link.
    waitlist: waitlistRepo(db),
    // Token-addressed public reads (the token is the capability, SEC-13); no user id.
    publicShares: publicSharesRepo(db),
    shares: sharesRepo(db),
    pushTokens: pushTokensRepo(db),
    styleProfile: styleProfileRepo(db),
    // Her Style DNA, the brief in her words and the memory (legacy Settings + style memory).
    styleDna: styleDnaRepo(db),
    styleMemory: styleMemoryRepo(db),
    usage: usageRepo(db),
    trips: tripsRepo(db),
    wardrobe: wardrobeRepo(db),
    wishlist: wishlistRepo(db),
  };
}

// System repositories for workers; addressed by record id, never exposed to route handlers.
export function createSystemRepositories(db: Db) {
  return {
    accountDeletion: accountDeletionRepo(db),
    dataExport: dataExportRepo(db),
    assets: assetProcessingRepo(db),
    jobs: jobRunnerRepo(db),
    ledger: ledgerRepo(db),
    inboxIntake: inboxIntakeRepo(db),
    maintenance: maintenanceRepo(db),
    avatarCells: avatarCellsRepo(db),
    modelRender: modelRenderRepo(db),
    notifier: notifierRepo(db),
    overnight: overnightRepo(db),
    pushDelivery: pushDeliveryRepo(db),
    pieces: pieceAnalysisRepo(db),
    styleAnalysis: styleAnalysisRepo(db),
    styleBrief: styleBriefRepo(db),
    frames: framesRepo(db),
    styling: stylingRepo(db),
    suggested: suggestedLooksRepo(db),
    noticed: noticedRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export type SystemRepositories = ReturnType<typeof createSystemRepositories>;
export type { AdminActor } from './admin-reads';
export type { AssetKind } from './assets';
export type { ConsentAnswers } from './consents';
export type { FramedType, StoredFrame, StoredFrameStatus } from './frames';
export { heldItems, type InboxAction, type InboxItem } from './inbox';
export type { CreateJobInput, QuotaCost } from './jobs';
export type { CallRecord } from './ledger';
export {
  DraftsFull,
  type LookFields,
  type LookPieceInput,
  LookPiecesNotFound,
  type LookRole,
} from './looks';
export type { StoredModelPicks } from './model';
export { OVERNIGHT_LEASE_HOURS, OVERNIGHT_LOCAL_HOUR, overnightKey } from './overnight';
export { encodeCursor, type Page } from './paging';
export type { PieceAnalysis } from './piece-analysis';
export type { PlanSlot } from './plan';
export { EDITABLE_PROFILE_FIELDS, type ProfilePatch } from './profiles';
export type { PushPlatform } from './push-tokens';
export { mintShareToken, type ShareSubject } from './shares';
export {
  type BriefList,
  type FactsPatch,
  type MemoryEntry,
  type MemoryEntryInput,
  type NoticedLine,
  PENDING_MAX,
  type PendingDraft,
  type PendingList,
  STRUCK_MAX,
  type TastePatch,
} from './style-dna';
export type { StyleOverrides } from './style-profile';
export type { SuggestedSpec } from './suggested';
export type { TripLookToPin } from './trips';
export type { ListPiecesQuery, PieceFields } from './wardrobe';
export type { WishFields } from './wishlist';
export { mintInboxAddress };
