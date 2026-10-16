'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { errors, you } from '@robes/copy';
import { Button, Field, Skeleton, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

export function AccountForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useApi('me.get');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [saved, setSaved] = useState(false);
  const update = useApiMutation('me.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.get'), data);
      setSaved(true);
      // The avatar and greeting are server-rendered from the profile.
      router.refresh();
    },
  });

  useEffect(() => {
    if (!me.data) return;
    setFirstName(me.data.firstName ?? '');
    setLastName(me.data.lastName ?? '');
    setHomeCity(me.data.homeCity ?? '');
  }, [me.data]);

  if (!me.data) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    update.mutate({
      input: { firstName: firstName.trim(), lastName: lastName.trim(), homeCity: homeCity.trim() },
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Field
        label={you.account.firstName}
        name="firstName"
        autoComplete="given-name"
        required
        maxLength={60}
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <Field
        label={you.account.lastName}
        name="lastName"
        autoComplete="family-name"
        maxLength={60}
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <Field
        label={you.account.homeCity}
        name="homeCity"
        autoComplete="address-level2"
        maxLength={120}
        value={homeCity}
        onChange={(e) => setHomeCity(e.target.value)}
        hint={you.account.homeCityHint}
      />
      <Field
        label={you.account.email}
        name="email"
        value={me.data.email}
        readOnly
        hint={you.account.emailHint}
      />
      <Button
        variant="primary"
        type="submit"
        disabled={firstName.trim().length === 0}
        loading={update.isPending}
        loadingLabel={you.account.saving}
      >
        {you.account.save}
      </Button>
      <Text role="status" size="small" tone="muted" className="min-h-5">
        {saved ? you.account.saved : ''}
      </Text>
      {update.isError ? (
        <Text role="alert" size="small" tone="danger">
          {errors.internal}
        </Text>
      ) : null}
    </form>
  );
}
