'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { Model } from '@robes/contracts';
import { diary } from '@robes/copy';
import { lineupOrder } from '@robes/core/avatar';
import { Icon } from '@robes/icons/web';
import { Sheet, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { errorCopy } from '@/lib/error-copy';
import { useSelfie } from '@/lib/use-selfie';

const copy = diary.model;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Felix's ModelPicker ("Your model", design 3a; D10): the body her looks are drawn on, opened
// from the ModelStack. One sideways row of 96×120 face-cropped cards, 10 apart: first "Use my
// likeness" (her selfie, the one door to her twin), then the five Robes models in a fixed order
// until she chooses; the chosen one then leads, ticked (lineupOrder). A pick applies at once and is
// remembered as a pick. The native twin is mobile/src/features/home/ModelPicker.tsx.
export function ModelPicker({
  open,
  model,
  onClose,
}: {
  open: boolean;
  model: Model | undefined;
  onClose: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const selfie = useSelfie();
  const stand = model?.stand;
  // Ticked: the Robes model her looks stand on — the one she chose, or the first until she does.
  const chosen = stand && stand.on !== 'robes' ? null : (model?.preset ?? 1);
  const pick = (n: number) => {
    void api
      .call('me.model.update', { input: { preset: n } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      })
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      // Felix's header: the small tracked title, not a question.
      title={<span className="type-label block text-ink-muted">{copy.title}</span>}
    >
      <div data-testid="model-picker">
        <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
          <li>
            <button
              type="button"
              onClick={() => {
                onClose();
                selfie.start();
              }}
              data-testid="model-own"
              className={`flex h-[120px] w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-thumb border border-cream400 border-dashed bg-surface px-2 ${focus}`}
            >
              <span className="flex size-12 items-center justify-center rounded-pill bg-surface-raised text-ink-muted">
                <Icon name="camera" size={22} />
              </span>
              <span className="type-label text-center text-ink-muted">{copy.own}</span>
            </button>
          </li>
          {lineupOrder({ own: false, chosen }).map((n, i) => {
            const g = model?.robesModels.find((r) => r.n === n);
            if (!g) return null;
            const on = g.n === chosen;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={diary.dayOne.modelPick(g.n)}
                  onClick={() => pick(g.n)}
                  data-testid={`model-${i}`}
                  className={`relative h-[120px] w-24 shrink-0 overflow-hidden rounded-thumb bg-surface-sunk ${
                    on ? 'border-2 border-ink' : 'border-[0.5px] border-rule-mid'
                  } ${focus}`}
                >
                  {g.imageUrl ? (
                    // biome-ignore lint/performance/noImgElement: a signed catalog portrait, fixed frame
                    <img
                      src={g.imageUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-[50%_9%]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-ink-faint">
                      <Icon name="user" size={22} />
                    </span>
                  )}
                  {on ? (
                    <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-pill bg-ink text-bg">
                      <Icon name="check" size={11} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
