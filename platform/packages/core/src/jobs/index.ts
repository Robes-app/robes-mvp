// Job vocabulary shared by the API, workers and clients; mirrors app.generation_jobs checks.
export const JOB_KINDS = [
  'fake',
  'key_piece',
  'daily',
  'travel',
  'travel_looks',
  'look_render',
  'avatar_cell',
  'wardrobe_analyse',
  'stylenotes_analyse',
  'receipt_read',
  'alternates',
  'lookbuild_note',
  'link_import',
  'cutout',
  'style_brief',
  'wardrobe_pieces',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'partial',
  'failed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const TERMINAL_JOB_STATUSES = ['succeeded', 'partial', 'failed', 'cancelled'] as const;
export type TerminalJobStatus = (typeof TERMINAL_JOB_STATUSES)[number];

export function isTerminalJobStatus(status: JobStatus): status is TerminalJobStatus {
  return (TERMINAL_JOB_STATUSES as readonly string[]).includes(status);
}

export const JOB_STAGES = ['queued', 'text', 'images', 'done'] as const;
export type JobStage = (typeof JOB_STAGES)[number];
