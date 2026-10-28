import { isTerminalJobStatus, type JobStatus } from '../jobs';

// The modular home (legacy 0478e63, Annie's Homepage_Modules): a stack of independent modules,
// resolved by how far she has come. O1 Style DNA · O2 the twin · O3 the wardrobe · O4 the first
// look lead until O3 and O4 are done; then the week (H3) and the looks (H4) take over.
export const HOME_STEPS = ['O1', 'O2', 'O3', 'O4'] as const;
export type HomeStep = (typeof HOME_STEPS)[number];

// H0 masthead · H1 alerts · H2 the box · H3 the week · H4 the looks · G1 the map of the steps.
export type HomeModule = 'H0' | 'H1' | 'H2' | 'H3' | 'H4' | 'G1' | HomeStep;

// Photographed pieces before the wardrobe step is done (legacy _LK_ROBES_AT, the first rung).
export const HOME_PICS_AT = 5;
// Later snoozes a step for a day.
export const HOME_SNOOZE_MS = 24 * 60 * 60 * 1000;
// Robes noticed waits for three saved looks (legacy H1).
export const HOME_NOTICED_AFTER = 3;
export const HOME_NOTICED_CHARS = 40;

export interface StyleRows {
  brands: readonly string[];
  icons: readonly string[];
  styles: readonly string[];
}

export interface HomeState {
  styleConfirmed: boolean;
  twinOnFile: boolean;
  // Pieces with a photograph.
  pics: number;
  // A look composed from hers (see ownLook).
  ownLookSaved: boolean;
  // Any saved look at all: the week strip shows from the first (legacy 0.3).
  anyLook?: boolean;
  // When she last tapped Later on a step (ISO).
  snoozed: Partial<Record<HomeStep, string>>;
}

export interface HomeResolved {
  activated: boolean;
  // The expanded step card, or null once activated.
  next: HomeStep | null;
  done: Record<HomeStep, boolean>;
  // 1–4 while a step leads, 5 once activated.
  stage: 1 | 2 | 3 | 4 | 5;
  modules: HomeModule[];
}

// Style DNA is confirmed once she said so (legacy style_dna.confirmed_at, beta's style walk Done),
// or by two of the three rows filled (brands · icons · styles).
export function styleConfirmed(rows: StyleRows, confirmedAt: Date | string | null = null): boolean {
  if (confirmedAt) return true;
  return [rows.brands, rows.icons, rows.styles].filter((r) => r.length > 0).length >= 2;
}

// A look composed from HERS: a Robes build, or at least one owned piece and no open proposal.
// A look kept off the deck keeps its proposals, so it never activates home on its own.
export function ownLook(look: {
  status: string;
  source: string;
  pieces: number;
  proposals: number;
}): boolean {
  if (look.status !== 'saved') return false;
  return look.source === 'robes-build' || (look.pieces >= 1 && look.proposals === 0);
}

export function resolveHome(
  st: HomeState,
  opts: { now?: Date; force?: HomeStep | null } = {},
): HomeResolved {
  const now = (opts.now ?? new Date()).getTime();
  const done: Record<HomeStep, boolean> = {
    O1: st.styleConfirmed,
    O2: st.twinOnFile,
    O3: st.pics >= HOME_PICS_AT,
    O4: st.ownLookSaved,
  };
  const snoozed = (k: HomeStep) => {
    const at = st.snoozed[k] ? Date.parse(st.snoozed[k]) : Number.NaN;
    return Number.isFinite(at) && now - at < HOME_SNOOZE_MS;
  };
  const activated = done.O3 && done.O4;
  let next: HomeStep | null = null;
  if (!activated) {
    if (opts.force && !done[opts.force]) next = opts.force;
    else
      next =
        HOME_STEPS.find((k) => !done[k] && !snoozed(k)) ?? HOME_STEPS.find((k) => !done[k]) ?? null;
  }
  const stage = (activated ? 5 : next ? HOME_STEPS.indexOf(next) + 1 : 5) as HomeResolved['stage'];
  const modules: HomeModule[] = ['H0', 'H1', 'H2'];
  if (!activated) {
    // The week strip stands from her first saved look, before the step that leads.
    if (st.anyLook) modules.push('H3');
    if (next) modules.push(next);
    modules.push('G1', 'H4');
  } else {
    modules.push('H3', 'H4');
    if (!done.O1 || !done.O2) modules.push('G1');
  }
  return { activated, next, done, stage, modules };
}

// G1: the other steps while onboarding; once activated, the first open of O1/O2 alone.
export function mapRows(r: HomeResolved): HomeStep[] {
  if (r.activated) return (['O1', 'O2'] as const).filter((k) => !r.done[k]).slice(0, 1);
  return HOME_STEPS.filter((k) => k !== r.next);
}

// O4's three candidates: heroes first, then the least worn, then the newest.
export function firstLookCandidates<
  T extends { heroPosition: number | null; wearCount: number; createdAt: string },
>(pieces: readonly T[], n = 3): T[] {
  return [...pieces]
    .sort(
      (a, b) =>
        Number(a.heroPosition === null) - Number(b.heroPosition === null) ||
        a.wearCount - b.wearCount ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, n);
}

// One short line for H1's Robes noticed (≤40 characters, cut at a word).
export function noticedLine(text: string, max = HOME_NOTICED_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

// The studio tray (Today's running jobs, and ones just finished): what each row is, and where it
// stands. Both clients read these; each maps a row to its own route.
export type TrayKind = 'styleColour' | 'trip' | 'daily' | 'stylePiece';
export function trayKind(job: { kind: string; output: { dailyLookId?: string } }): TrayKind {
  if (job.kind === 'stylenotes_analyse') return 'styleColour';
  if (job.kind === 'travel') return 'trip';
  if (job.kind === 'daily' || job.output.dailyLookId) return 'daily';
  return 'stylePiece';
}
export function trayState(status: JobStatus): 'running' | 'failed' | 'ready' {
  if (!isTerminalJobStatus(status)) return 'running';
  return status === 'failed' || status === 'cancelled' ? 'failed' : 'ready';
}

// After 19:00 today's planned look asks Wore it?
export const WORE_IT_HOUR = 19;

// A first name typed as an email prints the greeting alone (legacy H0).
export function greetingName(firstName: string | null | undefined): string | null {
  const n = firstName?.trim();
  return n && !n.includes('@') ? n : null;
}

// A trip-shaped ask (legacy 1ebfc72): while trips are hidden it makes suggested looks, UNDATED (a
// trip's first day in her home weather would read as the wrong answer), never a trip.
const TRIP_ASK =
  /\b(trip|holiday|getaway|city break|packing|pack for|travell?ing)\b|\b(\d+|two|three|four|five|six|seven|eight|nine|ten|a few)\s+(days|nights)\s+(in|at|away)\b|\bweekend (in|away)\b/i;
export function isTripAsk(text: string): boolean {
  return TRIP_ASK.test(text);
}
