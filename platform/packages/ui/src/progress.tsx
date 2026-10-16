import { ui } from '@robes/copy';
import { cn } from './cn';

export type ProgressStage = keyof typeof ui.progress;
export const PROGRESS_STAGES = Object.keys(ui.progress) as ProgressStage[];

export interface ProgressProps {
  stage: ProgressStage;
  // 0–1 across the whole job; omit while the stage has no measurable fill.
  value?: number;
  className?: string;
}

// Staged progress: the stage line comes from copy (never "Generating"), the bar fills per stage.
export function Progress({ stage, value, className }: ProgressProps) {
  const label = ui.progress[stage];
  const known = typeof value === 'number' && Number.isFinite(value);
  const clamped = known ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(clamped * 100);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p aria-hidden className="font-display text-lg font-light italic text-ink">
        {label}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={known ? percent : undefined}
        aria-valuetext={known ? `${label} ${percent}%` : label}
        className="h-0.5 w-full overflow-hidden rounded-pill bg-hairline"
      >
        {known ? (
          <div
            className="h-full origin-left bg-ink motion-safe:transition-transform motion-safe:duration-300"
            style={{ transform: `scaleX(${clamped})` }}
          />
        ) : (
          <div className="h-full w-1/3 bg-ink motion-safe:animate-sweep" />
        )}
      </div>
    </div>
  );
}
