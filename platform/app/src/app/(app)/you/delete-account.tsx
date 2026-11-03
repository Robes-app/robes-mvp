'use client';

import { useApi, useApiMutation } from '@robes/api-client/react';
import { errors, you } from '@robes/copy';
import { Button, Dialog, Field, Text, useToast } from '@robes/ui';
import { useState } from 'react';
import { SettingsRowContent, settingsRowClass } from '@/components/settings/settings-chrome';
import { useSignOut } from '@/components/use-sign-out';

const CONFIRM_WORD = 'DELETE';

// SEC-80 (a row of the Account tab's Profile card): typed confirmation, then the request is
// recorded, she is told and signed out; the deletion job removes everything within minutes.
// Native twin: mobile/src/features/you/DeleteAccount.tsx.
export function DeleteAccount() {
  const signOut = useSignOut();
  const toast = useToast();
  const status = useApi('me.deletion.get');
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const request = useApiMutation('me.deletion.request', {
    onSuccess: () => {
      setOpen(false);
      toast({ message: you.deletion.requested });
      void signOut();
    },
  });

  if (status.data?.request) {
    return (
      <div className={settingsRowClass}>
        <Text role="status" size="small" tone="muted">
          {you.deletion.requested}
        </Text>
      </div>
    );
  }

  return (
    <Dialog
      title={you.deletion.title}
      description={you.deletion.body}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped('');
      }}
      trigger={
        // The last row of Profile (legacy Account): the danger name, then ›.
        <button type="button" className={`${settingsRowClass} hover:bg-surface`}>
          <SettingsRowContent label={you.deletion.title} tone="danger" />
        </button>
      }
      footer={
        <Button
          variant="primary"
          block
          disabled={typed !== CONFIRM_WORD}
          loading={request.isPending}
          onClick={() => request.mutate({ input: { confirm: CONFIRM_WORD } })}
        >
          {you.deletion.confirm}
        </Button>
      }
    >
      <Field
        label={you.deletion.confirmLabel}
        name="confirm"
        autoComplete="off"
        autoCapitalize="characters"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        error={request.isError ? errors.internal : null}
      />
    </Dialog>
  );
}
