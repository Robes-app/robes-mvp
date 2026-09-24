'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { errors, you } from '@robes/copy';
import { Button, Dialog, Field, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const CONFIRM_WORD = 'DELETE';

// SEC-80: typed confirmation, then the request is recorded and the account shows as being deleted.
export function DeleteAccount() {
  const queryClient = useQueryClient();
  const status = useApi('me.deletion.get');
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const request = useApiMutation('me.deletion.request', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.deletion.get'), { request: data });
      setOpen(false);
    },
  });

  if (status.data?.request) {
    return (
      <Text role="status" size="small" tone="muted">
        {you.deletion.requested}
      </Text>
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
        <Button variant="quiet" className="-mx-2 text-danger">
          {you.deletion.title}
        </Button>
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
