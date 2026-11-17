'use client';

import { consent, firstRun, twin } from '@robes/copy';
import { Button, ErrorText, Heading, Sheet } from '@robes/ui';
import { useState } from 'react';
import { Lineup, useModel, useModelPick, useTwinStatus } from '@/app/(app)/you/model/twin-parts';
import { SelfieCamera } from '@/app/(app)/you/selfie/selfie-camera';
import { AgreeBox, ConsentRows } from '@/app/(app)/you/selfie/twin-consent';
import { useAnalytics } from '@/components/analytics-provider';
import { useSelfieRead } from '@/lib/use-selfie';
import { Frame, QuietLink } from './frame';

const copy = firstRun.twin;
const consentCopy = twin.twinPage.consent;
// The consent's own rows, collecting the close-up only (PRD decision 5: no size facts here).
const ROWS = consentCopy.rows.map(([label, value], i) =>
  i === 0 ? ([label, copy.collects] as const) : ([label, value] as const),
);

// 07 Digital twin (onboarding PRD R-7; design Q5): the chosen model large, then the five Robes
// models for her identity (You's Lineup). No close-up is taken or sent before she ticks the
// consent (`photo_analysis`, saved before the camera opens); the selfie camera is You's own,
// opened in place, and its read comes back here and draws her twin. Native twin:
// mobile/src/features/onboarding/TwinStep.tsx.
export function TwinStep({
  step,
  onBack,
  onDone,
  onSkip,
}: {
  step: number;
  onBack: () => void;
  onDone: (twin: boolean) => void;
  onSkip: () => void;
}) {
  const query = useModel();
  const { pick, pending } = useModelPick();
  const read = useSelfieRead();
  const { consents, updateConsents } = useAnalytics();
  const [agreed, setAgreed] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [consentState, setConsentState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const model = query.data;
  const drawing = model?.twin.status === 'pending';
  const status = useTwinStatus(read.reading, drawing);
  const consented = consents?.photo_analysis === true;

  async function takeCloseUp() {
    if (consented) {
      setCamera(true);
      return;
    }
    setConsentState('saving');
    const ok = await updateConsents({ photo_analysis: true });
    setConsentState(ok ? 'idle' : 'failed');
    if (ok) setCamera(true);
  }

  if (camera) return <SelfieCamera returnTo="/onboarding" onClose={() => setCamera(false)} />;

  const twinUrl = model?.twin.imageUrl ?? null;
  const onRobes = model?.preset != null;
  const robes = onRobes ? model?.robesModels.find((m) => m.n === model.preset) : undefined;
  // You, until she picks a Robes model: her twin once drawn, else the close-up's face guide.
  const own = !onRobes;
  const busy = read.reading || drawing;
  const hero = own ? twinUrl : (robes?.imageUrl ?? null);
  const title = own ? copy.you : copy.robes;
  const titleEm = own ? (twinUrl ? copy.ready : copy.youEm) : copy.robesEm;
  const needsShot = own && !twinUrl && !busy;

  const footer = needsShot ? (
    <>
      {consented ? null : (
        <AgreeBox
          agreed={agreed}
          label={copy.agree}
          onToggle={setAgreed}
          privacy={
            <button
              type="button"
              onClick={() => setPrivacy(true)}
              className="text-ink-faint underline underline-offset-4"
            >
              {consentCopy.privacy}
            </button>
          }
        />
      )}
      {consentState === 'failed' ? <ErrorText>{consent.failed}</ErrorText> : null}
      <Button
        variant="primary"
        disabled={!consented && !agreed}
        loading={consentState === 'saving'}
        onClick={() => void takeCloseUp()}
      >
        {copy.go}
      </Button>
      <QuietLink label={firstRun.skip} onClick={onSkip} />
    </>
  ) : (
    <>
      <Button variant="primary" disabled={busy && own} onClick={() => onDone(own)}>
        {firstRun.continue}
      </Button>
      <QuietLink
        label={own ? copy.retake : model?.filed ? copy.useTwin : copy.useOwn}
        onClick={() => (own ? void takeCloseUp() : pick({ preset: null }))}
      />
    </>
  );

  return (
    <>
      <Frame step={step} title={title} titleEm={titleEm} onBack={onBack} footer={footer}>
        <div className="flex flex-col gap-4">
          {read.error ? <ErrorText>{read.error}</ErrorText> : null}
          <div
            className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-card bg-surface-sunk"
            data-testid="onboarding-twin-hero"
          >
            {hero ? (
              // biome-ignore lint/performance/noImgElement: a signed portrait URL
              <img
                src={hero}
                alt={own ? twin.twinPage.you : title}
                className="size-full object-cover object-[50%_20%]"
              />
            ) : (
              // Before her close-up (design Q5): a dashed oval with a face drawn in.
              <svg width="190" height="240" viewBox="0 0 150 190" fill="none" aria-hidden>
                <ellipse
                  cx="75"
                  cy="88"
                  rx="58"
                  ry="76"
                  className="stroke-selected-line"
                  strokeWidth="1.2"
                  strokeDasharray="4 5"
                />
                <path
                  d="M50 74c4-4 11-4 15 0M85 74c4-4 11-4 15 0M75 82v18l-5 4h8M62 124c8 6 18 6 26 0"
                  className="stroke-ink-muted"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {status ? (
              <p
                role="status"
                className="absolute bottom-3 rounded-pill bg-surface-raised px-3.5 py-2 text-ink-muted text-sm"
              >
                {status}
              </p>
            ) : null}
          </div>
          {model ? (
            // No tile for her before she has a twin (Annie, 17 Nov): a blank one read as the way to
            // take the close-up, which is the agreed box and Take my close-up below.
            <Lineup
              model={{
                ...model,
                stand: {
                  imageUrl: null,
                  generic: false,
                  ...model.stand,
                  on: own ? 'twin' : 'robes',
                },
              }}
              pick={pick}
              pending={pending}
            />
          ) : null}
        </div>
      </Frame>
      <Sheet open={privacy} onOpenChange={setPrivacy} title={consentCopy.eyebrow}>
        <div className="flex flex-col gap-5 pb-6">
          <Heading level={2} size="lg">
            {consentCopy.title} <em>{consentCopy.sub}</em>
          </Heading>
          <ConsentRows rows={ROWS} />
          <Button variant="primary" onClick={() => setPrivacy(false)}>
            {copy.gotIt}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
