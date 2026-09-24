import { useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Button, Field, PrimaryScope, Text, useToast } from '@robes/ui-native';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useSignOut } from '@/lib/use-sign-out';

const copy = you.deletion;
const CONFIRM = 'DELETE';

// SEC-80: typed confirmation, then the request is recorded and she is signed out.
export function DeleteAccount() {
  const signOut = useSignOut();
  const toast = useToast();
  const [typed, setTyped] = useState('');
  const { data: status } = useApi('me.deletion.get');
  const request = useApiMutation('me.deletion.request', {
    onSuccess: () => {
      toast.show({ message: copy.requested });
      void signOut();
    },
  });
  const requested = status?.request != null || request.isSuccess;
  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12" keyboardShouldPersistTaps="handled">
      <Text>{copy.body}</Text>
      {requested ? (
        <Text tone="muted">{copy.requested}</Text>
      ) : (
        <>
          <Field
            label={copy.confirmLabel}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            error={request.isError ? errorMessage(request.error) : null}
          />
          <PrimaryScope>
            <Button
              onPress={() => request.mutate({ input: { confirm: CONFIRM } })}
              disabled={typed.trim() !== CONFIRM}
              loading={request.isPending}
            >
              {copy.confirm}
            </Button>
          </PrimaryScope>
        </>
      )}
    </ScrollView>
  );
}
