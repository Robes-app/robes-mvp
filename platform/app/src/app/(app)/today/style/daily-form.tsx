'use client';

import { useApiMutation } from '@robes/api-client/react';
import { today } from '@robes/copy';
import { Button, ErrorText, TextArea } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = today.daily;

// Her brief is optional: an empty one styles "a regular day".
export function DailyForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const start = useApiMutation('today.generate', {
    onSuccess: ({ jobId }) => router.push(`/today/style/${jobId}`),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    start.mutate({ input: prompt.trim() ? { prompt: prompt.trim() } : {} });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextArea
        label={copy.promptLabel}
        name="prompt"
        placeholder={copy.promptPlaceholder}
        maxLength={500}
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      {start.isError ? <ErrorText>{errorCopy(start.error)}</ErrorText> : null}
      <Button
        variant="primary"
        type="submit"
        loading={start.isPending || start.isSuccess}
        loadingLabel={copy.starting}
        className="self-start"
      >
        {copy.start}
      </Button>
    </form>
  );
}
