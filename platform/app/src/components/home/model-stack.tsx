'use client';

import { diary } from '@robes/copy';
import { Icon } from '@robes/icons/web';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Felix's ModelStack (D10): at the photo's top left, 16 in — a tilted cream card with the camera
// behind a small portrait of the model her looks stand on, on a soft drop shadow. It opens the
// ModelPicker. Not shown once her digital twin stands. The native twin is
// mobile/src/features/home/ModelStack.tsx.
export function ModelStack({ portrait, onOpen }: { portrait: string | null; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={diary.model.choose}
      title={diary.model.choose}
      onClick={onOpen}
      data-testid="model-stack"
      className={`absolute top-4 left-4 z-10 h-[38px] w-10 drop-shadow-[0_2px_6px_rgb(0_0_0/0.3)] after:absolute after:-inset-[3px] after:content-[''] ${focus}`}
    >
      <span className="absolute top-0 right-0 flex h-[31px] w-6 rotate-[9deg] items-center justify-center rounded-xs bg-surface-sunk text-ink-muted">
        <Icon name="camera" size={15} />
      </span>
      <span
        className="absolute bottom-0 left-0 h-[31px] w-6 rounded-xs border-[1.5px] border-surface-raised bg-surface-sunk bg-no-repeat"
        style={
          portrait
            ? {
                backgroundImage: `url(${JSON.stringify(portrait)})`,
                backgroundSize: '450% auto',
                backgroundPosition: '50% 9%',
              }
            : undefined
        }
      />
    </button>
  );
}
