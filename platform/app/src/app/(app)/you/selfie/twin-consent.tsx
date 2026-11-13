'use client';

import { consent, twin } from '@robes/copy';
import { Button, ErrorText, Eyebrow, Heading, Text } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { SettingsGroup } from '@/components/settings/settings-chrome';
import { SelfieCamera } from './selfie-camera';

const copy = twin.twinPage.consent;

// The selfie page: the camera opens only once her yes to the twin is on her account
// (`photo_analysis`); until then this is the question.
export function SelfieGate() {
  const { consents } = useAnalytics();
  return consents?.photo_analysis === true ? <SelfieCamera /> : <TwinConsent />;
}

// Her yes before the selfie camera (Annie's "Digital twin consent" artboard, 11 Nov; App Store
// 5.1.2): what is collected, that Google Gemini makes the picture, and a box she ticks herself.
// Native twin: mobile/src/features/you/TwinConsent.tsx.
function TwinConsent() {
  const router = useRouter();
  const { updateConsents } = useAnalytics();
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle');

  async function agree() {
    setStatus('saving');
    setStatus((await updateConsents({ photo_analysis: true })) ? 'idle' : 'failed');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="twin-consent-title"
      className="fixed inset-0 z-45 overflow-y-auto bg-bg"
      data-testid="twin-consent"
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-5 pt-10 pb-6">
        <div className="flex flex-col gap-1">
          <Heading id="twin-consent-title" size="xl">
            {copy.title}
          </Heading>
          <Text italic tone="muted">
            {copy.sub}
          </Text>
        </div>
        <SettingsGroup>
          <dl>
            {copy.rows.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-rule border-t-[0.5px] px-3.5 py-2.5 first:border-t-0"
              >
                <dt>
                  <Eyebrow>{label}</Eyebrow>
                </dt>
                <dd>
                  <Text size="small">{value}</Text>
                </dd>
              </div>
            ))}
          </dl>
        </SettingsGroup>
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-ink-muted text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-[18px] flex-none accent-ink"
          />
          <span>
            {copy.agree}{' '}
            <Link href="/legal/privacy" target="_blank" className="underline underline-offset-4">
              {copy.privacy}
            </Link>
          </span>
        </label>
        {status === 'failed' ? <ErrorText>{consent.failed}</ErrorText> : null}
        <div className="mt-auto grid grid-cols-[1fr_2fr] gap-2 border-rule border-t-[0.5px] pt-3">
          <Button
            block
            onClick={() =>
              window.history.length > 1 ? router.back() : router.replace('/you/model')
            }
          >
            {copy.notNow}
          </Button>
          <Button
            block
            variant="primary"
            disabled={!agreed}
            loading={status === 'saving'}
            onClick={() => void agree()}
          >
            {copy.go}
          </Button>
        </div>
      </div>
    </div>
  );
}
