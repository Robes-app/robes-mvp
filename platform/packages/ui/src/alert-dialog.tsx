'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Button, PrimaryScope } from './button';

export interface AlertDialogAction {
  label: string;
  // Felix: `primary` the consequence, verb first ("Discard"); `outline` the safe way back ("Keep
  // editing"); `quiet` an optional "Cancel"; `danger` the consequence when it destroys ("Delete").
  variant: 'primary' | 'outline' | 'quiet' | 'danger';
  onClick: () => void;
}

export interface AlertDialogProps {
  open: boolean;
  // A question or a plain statement: "Discard this draft?", "Save your changes".
  title: string;
  // One sentence saying what happens: "The look won't be saved or scheduled."
  message?: string;
  // At most three, in Felix's order.
  actions: readonly AlertDialogAction[];
  // A tap outside the card, or Escape.
  onDismiss: () => void;
}

// Felix's AlertDialog: the centred confirm before anything that can't be undone or needs a choice.
// A cream card (card radius, the dialog shadow, 22 20 16, centred) over `backdrop-strong` with
// 32px side gutters, fading in over 0.2s; the actions stack 8px apart, the pills 44 tall. Its own
// layer, so its primary stands beside the page's. Twin of ui-native AlertDialog.tsx.
export function AlertDialog({ open, title, message, actions, onDismiss }: AlertDialogProps) {
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-backdrop-strong motion-safe:data-[state=open]:animate-[robes-fade-in_200ms_ease]" />
        <RadixDialog.Content
          role="alertdialog"
          {...(message ? {} : { 'aria-describedby': undefined })}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-4rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card bg-bg px-5 pt-[22px] pb-4 text-center text-ink shadow-dialog"
        >
          <RadixDialog.Title className="font-display font-normal text-[22px] leading-[1.2]">
            {title}
          </RadixDialog.Title>
          {message ? (
            <RadixDialog.Description className="mt-2 font-sans text-ink-muted text-xs leading-normal">
              {message}
            </RadixDialog.Description>
          ) : null}
          <PrimaryScope>
            <div className="mt-[18px] flex flex-col gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                  className={action.variant === 'outline' ? 'min-h-11' : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </PrimaryScope>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
