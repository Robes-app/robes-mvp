import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { you } from '@robes/copy';
import { Button, Field, PrimaryScope, Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { errorMessage } from '@/lib/errors';

const copy = you.account;

function AccountForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(me.firstName ?? '');
  const [lastName, setLastName] = useState(me.lastName ?? '');
  const [homeCity, setHomeCity] = useState(me.homeCity ?? '');
  const update = useApiMutation('me.update', {
    onSuccess: (next) => queryClient.setQueryData(queryKeys.call('me.get'), next),
  });
  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12" keyboardShouldPersistTaps="handled">
      <Field
        label={copy.firstName}
        value={firstName}
        onChangeText={setFirstName}
        maxLength={60}
        autoComplete="given-name"
      />
      <Field
        label={copy.lastName}
        value={lastName}
        onChangeText={setLastName}
        maxLength={60}
        autoComplete="family-name"
      />
      <Field
        label={copy.homeCity}
        value={homeCity}
        onChangeText={setHomeCity}
        maxLength={120}
        hint={copy.homeCityHint}
      />
      <Field label={copy.email} value={me.email} editable={false} hint={copy.emailHint} />
      {update.isError ? <Text tone="danger">{errorMessage(update.error)}</Text> : null}
      {update.isSuccess ? <Text tone="success">{copy.saved}</Text> : null}
      <PrimaryScope>
        <Button
          onPress={() =>
            update.mutate({
              input: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                homeCity: homeCity.trim(),
              },
            })
          }
          disabled={firstName.trim() === ''}
          loading={update.isPending}
          loadingLabel={copy.saving}
        >
          {copy.save}
        </Button>
      </PrimaryScope>
    </ScrollView>
  );
}

export function Account() {
  const { data: me } = useApi('me.get');
  return me ? <AccountForm me={me} /> : <LoadingScreen />;
}
